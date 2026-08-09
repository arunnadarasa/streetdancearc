import { createFileRoute } from "@tanstack/react-router";
import midnight from "@/data/midnight-contract.undeployed.json";
import {
  corsHeaders,
  decodePaymentSignature,
  defaultMusdcPayTo,
  getHeaderCI,
  getSettledNonce,
  setSettledNonce,
  validatePayloadAgainstRequirement,
  X402_NETWORK,
} from "@/lib/x402-facilitator";

type DeployFile = {
  contracts?: { midnightUsdc?: { address?: string } };
};

export const Route = createFileRoute("/api/public/x402-settle")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const networkId = (process.env.VITE_NETWORK_ID ?? "undeployed").toLowerCase();
          const sig =
            getHeaderCI(request.headers, "PAYMENT-SIGNATURE") ??
            getHeaderCI(request.headers, "payment-signature");
          if (!sig) {
            return Response.json(
              { ok: false, error: "missing PAYMENT-SIGNATURE" },
              { status: 400, headers: corsHeaders() },
            );
          }

          const body = (await request.json().catch(() => ({}))) as {
            amountAtomic?: number | string;
            memo?: string;
            musdcAddress?: string;
          };

          const payload = decodePaymentSignature(sig);
          const check = validatePayloadAgainstRequirement(payload, {
            network: X402_NETWORK,
            amount:
              body.amountAtomic !== undefined
                ? String(body.amountAtomic)
                : undefined,
          });
          if (!check.ok) {
            return Response.json(
              { ok: false, error: check.error },
              { status: 400, headers: corsHeaders() },
            );
          }

          const nonce = payload.payload.nonce.replace(/^0x/i, "");
          const cached = getSettledNonce(nonce);
          if (cached) {
            return Response.json(cached, {
              headers: {
                ...corsHeaders(),
                "PAYMENT-RESPONSE": Buffer.from(JSON.stringify(cached), "utf8").toString("base64"),
              },
            });
          }

          const deploy = midnight as DeployFile;
          const musdcAddress =
            body.musdcAddress ||
            process.env["VITE_MUSDC_CONTRACT"] ||
            deploy.contracts?.midnightUsdc?.address ||
            "";
          const amount = payload.accepted.amount;
          const payTo = payload.accepted.payTo || defaultMusdcPayTo();

          if (!musdcAddress || networkId !== "undeployed") {
            const simulated = {
              ok: true,
              simulated: true as const,
              success: true,
              midnightTxHash: "0xSIMULATED",
              network: X402_NETWORK,
              amount,
              nonce,
              fromPk: "simulated",
              toPk: payTo,
            };
            setSettledNonce(nonce, simulated);
            return Response.json(simulated, {
              headers: {
                ...corsHeaders(),
                "PAYMENT-RESPONSE": Buffer.from(JSON.stringify(simulated), "utf8").toString(
                  "base64",
                ),
              },
            });
          }

          const { musdcFaucet, musdcTransfer } = await import("@/lib/musdc.server");
          await musdcFaucet().catch(() => {});
          const transfer = await musdcTransfer({
            toHex: payTo,
            amountAtomic: amount,
            nonceHex: nonce,
          });

          const result = {
            ok: true,
            simulated: false as const,
            success: true,
            midnightTxHash: transfer.midnightTxHash,
            network: X402_NETWORK,
            amount: transfer.amount,
            nonce,
            musdcAddress: transfer.contractAddress,
            fromPk: transfer.fromPk,
            toPk: transfer.toPk,
            memo: body.memo ?? payload.payload.memo ?? null,
            indexerUrl: transfer.indexerUrl,
          };

          setSettledNonce(nonce, result);
          return Response.json(result, {
            headers: {
              ...corsHeaders(),
              "PAYMENT-RESPONSE": Buffer.from(JSON.stringify(result), "utf8").toString("base64"),
              "midnight-tx": transfer.midnightTxHash,
            },
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("[api/public/x402-settle]", message);
          return Response.json(
            { ok: false, simulated: false, error: message },
            { status: 500, headers: corsHeaders() },
          );
        }
      },
    },
  },
});
