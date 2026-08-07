import { createFileRoute } from "@tanstack/react-router";
import { buildAgentCard } from "@/lib/agent-card";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/agent-card")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const payTo =
          process.env["CIRCLE_TREASURY_ADDRESS"] ??
          "0x0000000000000000000000000000000000000000";
        const card = buildAgentCard(origin, payTo);
        return Response.json(
          {
            ...card,
            version: "1.1.0",
            capabilities: {
              ...card.capabilities,
              extensions: [
                { uri: "https://github.com/google-agentic-commerce/a2a-x402/v0.1", description: "a2a-x402 onchain settlement" },
                { uri: "https://ucp.dev/spec", description: "UCP discovery at /api/public/ucp/discovery" },
                { uri: "https://github.com/google-agentic-commerce/AP2", description: "AP2 mandates at /api/public/ap2/mandate" },
              ],
            },
            skills: [
              ...card.skills,
              {
                id: "a2a_message",
                name: "A2A message/send",
                description: "JSON-RPC endpoint for agent negotiation. Returns AP2 CartMandate + a2a-x402 payment-required on turn 1, and a PaymentMandate receipt on turn 2.",
                tags: ["a2a", "ap2", "x402", "agent"],
                endpoint: { method: "POST", path: "/api/public/a2a/message" },
              },
              {
                id: "ucp_discovery",
                name: "UCP discovery",
                description: "Universal Commerce Protocol discovery profile for the Arc Testnet USDC payment handler.",
                tags: ["ucp", "discovery", "commerce"],
                endpoint: { method: "GET", path: "/api/public/ucp/discovery" },
              },
              {
                id: "ap2_mandate",
                name: "AP2 mandate",
                description: "Generate an AP2 CartMandate + PaymentMandate + x402 requirement for a given SKU.",
                tags: ["ap2", "mandate", "x402"],
                endpoint: { method: "POST", path: "/api/public/ap2/mandate" },
              },
              {
                id: "x402_resources",
                name: "x402 resource discovery",
                description: "StreetRail published in the Circle Agent Marketplace discovery shape — resource, accepts[] for USDC/EURC/cirBTC on Arc Testnet, and provider metadata.",
                tags: ["x402", "discovery", "marketplace", "arc"],
                endpoint: { method: "GET", path: "/api/public/x402/resources" },
              },
            ],
          },
          { headers: { ...CORS, "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
