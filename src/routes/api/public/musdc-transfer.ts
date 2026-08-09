import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash } from "node:crypto";

const Schema = z.object({
  toHex: z.string().optional(),
  amountAtomic: z.union([z.string(), z.number()]),
  nonceHex: z.string().optional(),
  memo: z.string().optional(),
});

/** Deterministic merchant "address" (32-byte hex) for StreetRail treasury on mUSDC. */
function defaultPayTo(): string {
  return createHash("sha256").update("streetrail:treasury:v1").digest("hex");
}

export const Route = createFileRoute("/api/public/musdc-transfer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json({ error: "Undeployed-only" }, { status: 501 });
          }
          const parsed = Schema.parse(await request.json());
          const { musdcTransfer } = await import("@/lib/musdc.server");
          const result = await musdcTransfer({
            toHex: parsed.toHex ?? defaultPayTo(),
            amountAtomic: parsed.amountAtomic,
            nonceHex: parsed.nonceHex,
          });
          return Response.json({ ...result, memo: parsed.memo ?? null });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Auto-faucet then retry once on "no balance" / "already claimed" races
          if (/no balance|insufficient/i.test(msg)) {
            try {
              const { musdcFaucet, musdcTransfer } = await import("@/lib/musdc.server");
              await musdcFaucet().catch(() => {});
              const parsed = Schema.parse(await request.clone().json().catch(() => ({})));
              const result = await musdcTransfer({
                toHex: parsed.toHex ?? defaultPayTo(),
                amountAtomic: parsed.amountAtomic ?? 0,
                nonceHex: parsed.nonceHex,
              });
              return Response.json({ ...result, faucetTopUp: true });
            } catch (e2) {
              const msg2 = e2 instanceof Error ? e2.message : String(e2);
              return Response.json({ error: msg2 }, { status: 500 });
            }
          }
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
