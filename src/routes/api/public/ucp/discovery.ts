import { createFileRoute } from "@tanstack/react-router";
import { ARC_CAIP2, USDC_ARC } from "@/lib/agent-card";
import { UCP_VERSION, type DiscoveryProfile } from "@/lib/ucp";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/ucp/discovery")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const payTo = process.env["CIRCLE_TREASURY_ADDRESS"] ?? "0x0000000000000000000000000000000000000000";

        const profile: DiscoveryProfile = {
          payment: {
            handlers: [
              {
                id: "arc-testnet-usdc",
                name: "Arc Testnet USDC",
                spec: "https://ucp.dev/latest/specification/overview/",
                version: UCP_VERSION,
                config_schema: "https://ucp.dev/schemas/0.1/payment-handler",
                instrument_schemas: ["https://ucp.dev/schemas/0.1/payment-instrument/evm-erc20"],
                config: {
                  chainId: 5042002,
                  network: "arc-testnet",
                  asset: "USDC",
                  assetType: "erc20",
                  payTo,
                  rpc: "https://rpc.testnet.arc.network",
                },
              },
            ],
          },
          signing_keys: [
            {
              kid: "streetkode-demo-key-1",
              kty: "OKP",
              crv: "Ed25519",
              use: "sig",
              alg: "EdDSA",
              x: "demo-public-key-stub-for-hackathon-demo-only",
            },
          ],
          ucp: {
            version: UCP_VERSION,
            capabilities: [
              {
                name: "checkout",
                spec: "https://ucp.dev/latest/specification/overview/",
                version: UCP_VERSION,
                schema: "https://ucp.dev/schemas/0.1/checkout",
              },
              {
                name: "order",
                spec: "https://ucp.dev/latest/specification/overview/",
                version: UCP_VERSION,
                schema: "https://ucp.dev/schemas/0.1/order",
              },
              {
                name: "a2a.commerce",
                spec: "https://a2a-protocol.org/latest/",
                version: "0.3.0",
                schema: "https://a2a-protocol.org/schemas/agent-card",
                config: { endpoint: `${origin}/api/public/a2a/message` },
              },
            ],
            services: {
              merchant: {
                spec: "https://ucp.dev/latest/specification/overview/",
                version: UCP_VERSION,
                rest: { endpoint: `${origin}/api/public/ucp`, schema: "https://ucp.dev/schemas/0.1" },
              },
            },
          },
        };

        return Response.json(profile, { headers: { ...CORS, "Cache-Control": "public, max-age=60" } });
      },
    },
  },
});
