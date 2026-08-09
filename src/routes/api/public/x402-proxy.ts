import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, getHeaderCI } from "@/lib/x402-facilitator";

/**
 * Same-origin CORS-safe proxy for facilitator calls.
 * Forwards PAYMENT-SIGNATURE and restores PAYMENT-RESPONSE.
 */
export const Route = createFileRoute("/api/public/x402-proxy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const targetPath = url.searchParams.get("to") ?? "/api/public/x402-settle";
          if (!targetPath.startsWith("/api/public/x402-")) {
            return Response.json(
              { ok: false, error: "proxy target must be /api/public/x402-*" },
              { status: 400, headers: corsHeaders() },
            );
          }

          const origin = url.origin;
          const sig =
            getHeaderCI(request.headers, "PAYMENT-SIGNATURE") ??
            getHeaderCI(request.headers, "payment-signature");
          const body = await request.arrayBuffer();

          const upstream = await fetch(`${origin}${targetPath}`, {
            method: "POST",
            headers: {
              "content-type": request.headers.get("content-type") ?? "application/json",
              ...(sig ? { "PAYMENT-SIGNATURE": sig } : {}),
            },
            body,
          });

          const text = await upstream.text();
          const paymentResponse =
            getHeaderCI(upstream.headers, "PAYMENT-RESPONSE") ??
            getHeaderCI(upstream.headers, "payment-response");

          const headers: Record<string, string> = {
            ...corsHeaders(),
            "content-type": upstream.headers.get("content-type") ?? "application/json",
          };
          if (paymentResponse) headers["PAYMENT-RESPONSE"] = paymentResponse;
          const midnightTx = getHeaderCI(upstream.headers, "midnight-tx");
          if (midnightTx) headers["midnight-tx"] = midnightTx;

          return new Response(text, { status: upstream.status, headers });
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
