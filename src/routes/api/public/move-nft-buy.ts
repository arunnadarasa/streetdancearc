import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const InputSchema = z.object({
  tokenId: z.string().regex(/^\d+$/),
  buyerLabel: z.string().trim().min(3).max(200),
});

export const Route = createFileRoute("/api/public/move-nft-buy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json({ error: "Undeployed-only" }, { status: 501 });
          }
          const parsed = InputSchema.parse(await request.json());
          const { buyMoveNft } = await import("@/lib/move-nft.server");
          return Response.json({ ...(await buyMoveNft(parsed)), simulated: false });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
