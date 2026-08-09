import { createFileRoute } from "@tanstack/react-router";
import {
  corsHeaders,
  decodePaymentSignature,
  getHeaderCI,
  validatePayloadAgainstRequirement,
  X402_NETWORK,
} from "@/lib/x402-facilitator";

export const Route = createFileRoute("/api/public/x402-verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const sig =
            getHeaderCI(request.headers, "PAYMENT-SIGNATURE") ??
            getHeaderCI(request.headers, "payment-signature");
          if (!sig) {
            return Response.json(
              { isValid: false, invalidReason: "missing PAYMENT-SIGNATURE" },
              { status: 400, headers: corsHeaders() },
            );
          }

          const body = (await request.json().catch(() => ({}))) as {
            amount?: string;
            payTo?: string;
            chunkHash?: string;
            memo?: string;
          };

          const payload = decodePaymentSignature(sig);
          const check = validatePayloadAgainstRequirement(payload, {
            network: X402_NETWORK,
            amount: body.amount,
            payTo: body.payTo,
            chunkHash: body.chunkHash,
            memo: body.memo,
          });

          if (!check.ok) {
            return Response.json(
              { isValid: false, invalidReason: check.error },
              { status: 400, headers: corsHeaders() },
            );
          }

          return Response.json(
            {
              isValid: true,
              x402Version: 2,
              scheme: payload.accepted.scheme,
              network: payload.accepted.network,
              asset: payload.accepted.asset,
              amount: payload.accepted.amount,
              payer: payload.payload.from ?? null,
            },
            { headers: corsHeaders() },
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return Response.json(
            { isValid: false, invalidReason: message },
            { status: 400, headers: corsHeaders() },
          );
        }
      },
    },
  },
});
