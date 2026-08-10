import { createFileRoute } from "@tanstack/react-router";
import { localResource } from "@/lib/discovery.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * StreetRail published in the Circle Agent Marketplace discovery shape, so an
 * external agent can consume us exactly the way we consume Circle's catalog.
 */
export const Route = createFileRoute("/api/public/x402/resources")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const r = localResource(origin);
        return Response.json(
          {
            x402Version: 2,
            items: [
              {
                resource: r.resource,
                type: "http",
                x402Version: 2,
                lastUpdated: new Date().toISOString(),
                accepts: r.accepts.map((a) => ({
                  scheme: a.scheme,
                  network: a.network,
                  asset: a.asset,
                  payTo:
                    process.env["CIRCLE_TREASURY_ADDRESS"] ??
                    "0x0000000000000000000000000000000000000000",
                  amount: a.amount,
                  maxTimeoutSeconds: a.maxTimeoutSeconds,
                  extra: { name: a.assetName, version: "2" },
                })),
                metadata: {
                  provider: {
                    name: "StreetRail",
                    website: origin,
                    docsUrl: "https://github.com/arunnadarasa/streetdancearc",
                    description: r.description,
                    category: r.category,
                    tags: r.tags,
                  },
                  path: "/api/public/purchase",
                  method: "POST",
                  description: r.description,
                  mimeType: "application/json",
                },
              },
            ],
          },
          { headers: { ...CORS, "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
