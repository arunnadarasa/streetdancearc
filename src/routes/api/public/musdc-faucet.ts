import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/musdc-faucet")({
  server: {
    handlers: {
      POST: async () => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json({ error: "Undeployed-only" }, { status: 501 });
          }
          const { musdcFaucet } = await import("@/lib/musdc.server");
          return Response.json(await musdcFaucet());
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
