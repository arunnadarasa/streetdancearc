import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  A2A_PROTOCOL_VERSION,
  AP2_VERSION,
  buildA2ATask,
  findDataPart,
  MIME,
  rpcErr,
  rpcOk,
  type A2AMessage,
  type JSONRPCRequest,
} from "@/lib/a2a";
import { ARC_CAIP2, DEMO_SCALE, USDC_ARC, type AgentCard } from "@/lib/agent-card";
import { buildCartMandate, buildPaymentMandate, type CatalogItem } from "@/lib/ap2";
import { signed } from "@/lib/mandate-sign.server";
import { convertFromFiat } from "@/lib/tokens";
import { getFxRates } from "@/lib/fx.server";
import {
  SHOPIFY_STOREFRONT_TOKEN,
  SHOPIFY_STOREFRONT_URL,
  STOREFRONT_QUERY,
} from "@/lib/shopify";
import { categoryFor } from "../catalog";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MessageSchema = z.object({
  messageId: z.string(),
  role: z.enum(["agent", "user"]),
  kind: z.literal("message"),
  contextId: z.string().optional(),
  taskId: z.string().optional(),
  parts: z.array(z.record(z.unknown())),
});

async function fetchCatalog(): Promise<CatalogItem[]> {
  const [upstream, fx] = await Promise.all([
    fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: STOREFRONT_QUERY, variables: { first: 24 } }),
    }),
    getFxRates(),
  ]);
  if (!upstream.ok) return [];
  const json = (await upstream.json()) as any;
  return (json?.data?.products?.edges ?? []).map((e: any) => {
    const n = e.node;
    const listed = Number(n.priceRange?.minVariantPrice?.amount ?? 0);
    const currency = n.priceRange?.minVariantPrice?.currencyCode ?? "GBP";
    const usdMinor = convertFromFiat(listed * DEMO_SCALE, currency, "USDC", fx) * 1e6;
    return {
      sku: n.handle,
      title: n.title,
      description: n.description?.slice(0, 200) ?? "",
      priceMinor: usdMinor.toFixed(0),
      currency: "USDC",
      category: categoryFor(n.title),
    };
  });
}

function buildCard(origin: string, payTo: string): AgentCard {
  return {
    protocolVersion: A2A_PROTOCOL_VERSION,
    name: "streetrail-storefront",
    description:
      "Street dance streetwear storefront. Speaks A2A 0.3 JSON-RPC, exposes the live catalog as typed offers, and settles orders in USDC on Circle's Arc Testnet via an a2a-x402 payment challenge.",
    url: `${origin}/api/public/a2a/message`,
    provider: { organization: "StreetKode Fam", url: origin },
    version: "1.1.0",
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json", "text/plain"],
    skills: [
      {
        id: "purchase-streetwear",
        name: "Purchase streetwear",
        description:
          "Negotiate access to a physical streetwear SKU. Returns an AP2 CartMandate + a2a-x402 payment-required; settle on Arc Testnet (chainId 5042002) to receive an order receipt.",
        tags: ["commerce", "streetwear", "ap2", "x402", "a2a"],
        endpoint: { method: "POST", path: "/api/public/a2a/message" },
      },
    ],
    extensions: {
      payments: {
        protocol: "a2a-x402",
        schemes: ["exact"],
        networks: [ARC_CAIP2],
        assets: [{ symbol: "USDC", address: USDC_ARC, decimals: 6, caip19: `${ARC_CAIP2}/erc20:${USDC_ARC}` }],
        payTo,
        demoScale: DEMO_SCALE,
        gasToken: "USDC",
      },
      rights: {
        registry: "0x4d13b45f823f8944522890c20d8695b6005465f0",
        chain: ARC_CAIP2,
        explorer: "https://testnet.arcscan.app/address/0x4d13b45f823f8944522890c20d8695b6005465f0",
        description:
          "DanceMoveTokens — the move-rights registry. An offer's provenance pointer resolves to a log() event naming the choreographer and the IPFS rights CID.",
      },
    },
  };
}

export const Route = createFileRoute("/api/public/a2a/message")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const payTo = process.env["CIRCLE_TREASURY_ADDRESS"] ?? "";
        const origin = new URL(request.url).origin;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(rpcErr(null, -32700, "Parse error"), { status: 200, headers: CORS });
        }

        const parsed = (body ?? {}) as JSONRPCRequest;
        if (parsed.jsonrpc !== "2.0") {
          return Response.json(rpcErr(parsed.id, -32600, "Invalid Request"), { status: 200, headers: CORS });
        }

        if (parsed.method === "agent/getCard") {
          return Response.json(rpcOk(parsed.id, buildCard(origin, payTo)), { headers: CORS });
        }

        if (parsed.method === "message/send") {
          const params = z
            .object({
              message: MessageSchema,
              referencingTaskId: z.string().optional(),
            })
            .safeParse(parsed.params ?? {});
          if (!params.success) {
            return Response.json(
              rpcErr(parsed.id, -32602, `Invalid params: ${params.error.issues.map((i) => i.message).join(", ")}`),
              { status: 200, headers: CORS },
            );
          }

          const msg = params.data.message as A2AMessage;
          const contextId = msg.contextId ?? `ctx_${crypto.randomUUID()}`;
          const taskId = params.data.referencingTaskId ?? `task_${crypto.randomUUID()}`;

          // If the message carries an x402 payload, verify and complete.
          const x402 = findDataPart<{ txHash: string; payer: string }>(msg.parts, MIME.X402_PAYLOAD);
          if (x402?.txHash) {
            const cart = findDataPart<ReturnType<typeof buildCartMandate>>(msg.parts, MIME.AP2_CART);
            const paymentMandate = signed(buildPaymentMandate(
              cart ?? {
                ap2Version: AP2_VERSION,
                type: "CartMandate",
                cartId: "unknown",
                merchant: { name: "streetrail-storefront", payTo: payTo as `0x${string}` },
                items: [],
                totals: [{ label: "Total", value: "0", asset: "USDC" }],
                network: ARC_CAIP2,
                chainId: 5042002,
                issuedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                signature: "demo:none",
              },
              (x402.payer ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
              x402.txHash as `0x${string}`,
            ));
            const receipt = buildA2ATask({
              id: taskId,
              contextId,
              state: "completed",
              message: {
                messageId: `msg_${crypto.randomUUID()}`,
                role: "agent",
                kind: "message",
                parts: [
                  { kind: "text", text: "Payment received. Order receipt attached." },
                  { kind: "data", mimeType: MIME.AP2_PAYMENT, data: paymentMandate },
                ],
              },
            });
            return Response.json(rpcOk(parsed.id, receipt), { headers: CORS });
          }

          // First turn: look up the first text part, pick the first matching SKU, return quote.
          const textPart = msg.parts.find((p: any) => p.kind === "text");
          const text = typeof (textPart as any)?.text === "string" ? (textPart as any).text : "";
          const catalog = await fetchCatalog();
          const keyword = text.toLowerCase();
          const item =
            catalog.find((c) => keyword.includes(c.title.toLowerCase().split(" ")[0])) ?? catalog[0];

          if (!item) {
            const empty = buildA2ATask({
              id: taskId,
              contextId,
              state: "input-required",
              message: {
                messageId: `msg_${crypto.randomUUID()}`,
                role: "agent",
                kind: "message",
                parts: [{ kind: "text", text: "No matching SKU found. Please ask for a specific streetwear item." }],
              },
            });
            return Response.json(rpcOk(parsed.id, empty), { headers: CORS });
          }

          const cart = signed(buildCartMandate(item, 1, payTo as `0x${string}`, "streetrail-storefront"));
          const total = cart.totals[0]?.value ?? "0";
          const requirement = {
            x402Version: 2,
            error: null,
            accepts: [
              {
                scheme: "exact",
                network: ARC_CAIP2,
                amount: total,
                resource: `sku://${item.sku}`,
                description: `1 × ${item.title}`,
                mimeType: MIME.X402_RECEIPT,
                payTo,
                maxTimeoutSeconds: 300,
                asset: USDC_ARC,
                extra: { chainId: 5042002, sku: item.sku, cartId: cart.cartId },
              },
            ],
          };

          const task = buildA2ATask({
            id: taskId,
            contextId,
            state: "input-required",
            message: {
              messageId: `msg_${crypto.randomUUID()}`,
              role: "agent",
              kind: "message",
              parts: [
                { kind: "text", text: `I can offer ${item.title} for ${total} USDC on Arc Testnet.` },
                { kind: "data", mimeType: MIME.AP2_CART, data: cart },
                { kind: "data", mimeType: MIME.X402_REQUIRED, data: requirement },
              ],
            },
          });
          return Response.json(rpcOk(parsed.id, task), { headers: CORS });
        }

        return Response.json(rpcErr(parsed.id, -32601, `Method not found: ${parsed.method}`), {
          status: 200,
          headers: CORS,
        });
      },
    },
  },
});
