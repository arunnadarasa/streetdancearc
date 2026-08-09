import { createFileRoute } from "@tanstack/react-router";
import { MIDNIGHT_NETWORK, MUSDC_ASSET } from "@/lib/agent-card";
import { defaultMusdcPayTo, corsHeaders, X402_SCHEME } from "@/lib/x402-facilitator";
import midnight from "@/data/midnight-contract.undeployed.json";

type DeployFile = {
  contracts?: { midnightUsdc?: { address?: string } };
};

/**
 * StreetRail x402 discovery — midnight-mUSDC on Undeployed.
 */
export const Route = createFileRoute("/api/public/x402/resources")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const deploy = midnight as DeployFile;
        const musdc =
          process.env["VITE_MUSDC_CONTRACT"] ||
          deploy.contracts?.midnightUsdc?.address ||
          MUSDC_ASSET;
        return Response.json(
          {
            x402Version: 2,
            items: [
              {
                resource: `${origin}/api/public/purchase`,
                type: "http",
                x402Version: 2,
                lastUpdated: new Date().toISOString(),
                accepts: [
                  {
                    scheme: X402_SCHEME,
                    network: MIDNIGHT_NETWORK,
                    asset: musdc,
                    payTo: defaultMusdcPayTo(),
                    amount: "1000",
                    maxTimeoutSeconds: 300,
                    extra: {
                      name: "mUSDC",
                      version: "1",
                      facilitator: {
                        challenge: `${origin}/api/public/x402-challenge`,
                        verify: `${origin}/api/public/x402-verify`,
                        settle: `${origin}/api/public/x402-settle`,
                      },
                    },
                  },
                ],
                metadata: {
                  provider: {
                    name: "StreetRail",
                    website: origin,
                    docsUrl: "https://github.com/arunnadarasa/zealymidnight",
                    description:
                      "Street dance merch + move rights settled in experimental mUSDC on Midnight Undeployed.",
                    category: "commerce",
                    tags: ["midnight", "x402", "mUSDC", "streetwear"],
                  },
                  path: "/api/public/purchase",
                  method: "POST",
                  description: "StreetRail storefront purchase (402 → x402 facilitator settle).",
                  mimeType: "application/json",
                },
              },
            ],
          },
          { headers: { ...corsHeaders(), "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
