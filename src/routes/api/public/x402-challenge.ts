import { createFileRoute } from "@tanstack/react-router";
import midnight from "@/data/midnight-contract.undeployed.json";
import { INDEXER_URL } from "@/lib/tokens";
import {
  buildChallengeBody,
  corsHeaders,
  defaultMusdcPayTo,
  X402_ASSET,
} from "@/lib/x402-facilitator";

type DeployFile = {
  contracts?: { midnightUsdc?: { address?: string } };
};

export const Route = createFileRoute("/api/public/x402-challenge")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            amountAtomic?: number | string;
            priceMicroUsdc?: number | string;
            resource?: string;
            memo?: string;
            sku?: string;
            chunkHash?: string;
            payTo?: string;
            description?: string;
          };

          const amount = body.amountAtomic ?? body.priceMicroUsdc;
          if (amount === undefined) {
            return Response.json(
              { ok: false, error: "amountAtomic required" },
              { status: 400, headers: corsHeaders() },
            );
          }

          const deploy = midnight as DeployFile;
          const musdcAddress =
            process.env["VITE_MUSDC_CONTRACT"] ||
            deploy.contracts?.midnightUsdc?.address ||
            "";
          const payTo = (body.payTo || defaultMusdcPayTo()).replace(/^0x/i, "");

          const challenge = buildChallengeBody({
            resource: body.resource ?? "/api/public/x402-settle",
            amount: String(amount),
            payTo,
            asset: musdcAddress || X402_ASSET,
            memo: body.memo,
            chunkHash: body.chunkHash,
            sku: body.sku,
            description:
              body.description ??
              (body.sku ? `StreetRail order ${body.sku}` : "StreetRail mUSDC settlement"),
          });

          const warnings: string[] = [];
          if (!musdcAddress) {
            warnings.push("MidnightUSDC not deployed — settle may fail until bun run midnight:deploy");
          }

          return Response.json(
            {
              ...challenge,
              accepts: challenge.accepts.map((a) => ({
                ...a,
                amountFormatted: `${(Number(a.amount) / 1e6).toFixed(6)} mUSDC`,
                symbol: "mUSDC",
                decimals: 6,
                preferred: true,
                nonce: crypto.randomUUID(),
                extra: {
                  ...a.extra,
                  settlement: "Undeployed server-append via /api/public/x402-settle",
                  indexer: INDEXER_URL,
                  musdcAddress: musdcAddress || null,
                },
              })),
              ...(warnings.length ? { warning: warnings.join("; ") } : {}),
              paymentOptions: { midnight: "midnight-mUSDC" },
            },
            { status: 402, headers: corsHeaders() },
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return Response.json(
            { ok: false, error: message },
            { status: 500, headers: corsHeaders() },
          );
        }
      },
    },
  },
});
