import { createFileRoute } from "@tanstack/react-router";

const PUBLIC_ARC_RPC = "https://rpc.testnet.arc.network";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/arc-rpc")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const upstream = process.env["ARC_RPC_URL"] || PUBLIC_ARC_RPC;
        const body = await request.text();
        if (body.length > 200_000) {
          return new Response("Payload too large", { status: 413, headers: CORS });
        }
        try {
          JSON.parse(body);
        } catch {
          return new Response("Invalid JSON body", { status: 400, headers: CORS });
        }
        const res = await fetch(upstream, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        return new Response(await res.text(), {
          status: res.status,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      },
    },
  },
});
