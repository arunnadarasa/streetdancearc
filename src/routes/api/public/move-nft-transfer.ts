import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const InputSchema = z.object({
  tokenId: z.string().regex(/^\d+$/),
  fromLabel: z.string().trim().min(3).max(200),
  toLabel: z.string().trim().min(3).max(200),
});

export const Route = createFileRoute("/api/public/move-nft-transfer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json({ error: "Undeployed-only" }, { status: 501 });
          }
          const parsed = InputSchema.parse(await request.json());
          const { transferMoveNft } = await import("@/lib/move-nft.server");
          return Response.json({ ...(await transferMoveNft(parsed)), simulated: false });
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
