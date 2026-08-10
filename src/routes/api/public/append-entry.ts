import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const InputSchema = z.object({
  contractAddress: z.string().optional(),
  appTag: z.string().default("streetrail_move_registry"),
  message: z.string().min(1),
  payload: z.unknown().optional(),
});

function defaultContract(): string {
  // Prefer deploy JSON — Vite caches VITE_* across redeploys.
  const p = path.resolve("src/data/midnight-contract.undeployed.json");
  if (fs.existsSync(p)) {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    if (j.address) return j.address;
    if (j.contracts?.moveRegistry?.address) return j.contracts.moveRegistry.address;
  }
  const env = process.env.VITE_DEFAULT_CONTRACT;
  if (env) return env;
  throw new Error("No contract address. Run bun run midnight:deploy");
}

export const Route = createFileRoute("/api/public/append-entry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json(
              { error: "append-entry is Undeployed-only; use Lace on preview/preprod" },
              { status: 501 },
            );
          }
          const body = await request.json();
          const parsed = InputSchema.parse(body);
          const contractAddress = parsed.contractAddress || defaultContract();
          const { appendEntry } = await import("@/lib/append-entry.server");
          const result = await appendEntry({
            contractAddress,
            appTag: parsed.appTag,
            message: parsed.message,
            payload: parsed.payload,
          });
          return Response.json({ ...result, contractAddress, simulated: false });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
