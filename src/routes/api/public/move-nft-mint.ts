import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const InputSchema = z.object({
  ownerLabel: z.string().trim().min(3).max(200),
  uri: z.string().trim().min(1).max(20_000),
});

export const Route = createFileRoute("/api/public/move-nft-mint")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json(
              { error: "move-nft-mint is Undeployed-only; use Lace on preview/preprod" },
              { status: 501 },
            );
          }
          const body = await request.json();
          const parsed = InputSchema.parse(body);
          const { mintMoveNft } = await import("@/lib/move-nft.server");
          const result = await mintMoveNft(parsed);
          return Response.json({ ...result, simulated: false });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
