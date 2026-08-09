import { createFileRoute } from "@tanstack/react-router";

/** Legacy Arc JSON-RPC proxy — disabled after Midnight pivot. */
export const Route = createFileRoute("/api/public/arc-rpc")({
  server: {
    handlers: {
      POST: async () =>
        Response.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message:
                "Arc RPC removed. StreetRail settles on Midnight Undeployed — use the indexer at VITE_INDEXER_URL.",
            },
            id: null,
          },
          { status: 410 },
        ),
    },
  },
});
