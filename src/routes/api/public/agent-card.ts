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
        return Response.json(buildAgentCard(origin, payTo), {
          headers: { ...CORS, "Cache-Control": "public, max-age=60" },
        });
      },
    },
  },
});
