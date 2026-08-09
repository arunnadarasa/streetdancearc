import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  mandateHash: z.string().min(16),
  seller: z.string().optional(),
  amount: z.number().optional(),
});

export const Route = createFileRoute("/api/public/ap2-anchor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json({ error: "Undeployed-only" }, { status: 501 });
          }
          const parsed = Schema.parse(await request.json());
          const { anchorMandateOnUndeployed } = await import("@/lib/anchor-mandate.server");
          return Response.json(await anchorMandateOnUndeployed(parsed));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
