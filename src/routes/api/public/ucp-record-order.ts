import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  orderId: z.string().min(1),
  itemHash: z.string().min(1),
  buyer: z.string().min(1),
  amount: z.union([z.number(), z.string()]),
});

export const Route = createFileRoute("/api/public/ucp-record-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if ((process.env.VITE_NETWORK_ID ?? "undeployed") !== "undeployed") {
            return Response.json({ error: "Undeployed-only" }, { status: 501 });
          }
          const parsed = Schema.parse(await request.json());
          const { recordOrderOnUndeployed } = await import("@/lib/record-order.server");
          return Response.json(await recordOrderOnUndeployed(parsed));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
