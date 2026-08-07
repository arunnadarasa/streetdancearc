import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { describeAuthorizer, verify1271 } from "@/lib/erc1271.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const HashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const SigSchema = z.string().regex(/^0x[0-9a-fA-F]*$/).max(600);

/**
 * Public discovery + verification for StreetRail's ERC-1271 contract-wallet
 * authorization path. Counterparties (Circle Gateway, other agents) read this
 * to learn they can authorize treasury actions without an EOA delegate.
 *
 * GET /api/public/erc1271/authorizer
 * GET /api/public/erc1271/authorizer?hash=0x…&signature=0x…  -> live isValidSignature check
 */
export const Route = createFileRoute("/api/public/erc1271/authorizer")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const info = await describeAuthorizer();

        const rawHash = url.searchParams.get("hash");
        if (!rawHash) return Response.json(info, { headers: CORS });

        const parsed = HashSchema.safeParse(rawHash);
        if (!parsed.success) {
          return Response.json({ error: "invalid_hash" }, { status: 400, headers: CORS });
        }
        const rawSig = url.searchParams.get("signature") ?? "0x";
        const sig = SigSchema.safeParse(rawSig);
        if (!sig.success) {
          return Response.json({ error: "invalid_signature" }, { status: 400, headers: CORS });
        }

        try {
          const result = await verify1271(
            parsed.data as `0x${string}`,
            sig.data as `0x${string}`,
          );
          return Response.json({ ...info, check: { hash: parsed.data, ...result } }, { headers: CORS });
        } catch {
          return Response.json(
            { ...info, check: { hash: parsed.data, error: "rpc_unavailable" } },
            { status: 503, headers: CORS },
          );
        }
      },
    },
  },
});
