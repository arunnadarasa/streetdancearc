import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ARC_CAIP2, DEMO_SCALE, USDC_ARC } from "@/lib/agent-card";
import { buildCartMandate, buildPaymentMandate, buildSpendConstraints, type CatalogItem } from "@/lib/ap2";
import { categoryFor } from "../catalog";
import {
  SHOPIFY_STOREFRONT_TOKEN,
  SHOPIFY_STOREFRONT_URL,
  PRODUCT_BY_HANDLE_QUERY,
} from "@/lib/shopify";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Input = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
  payer: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
});

async function fetchProduct(sku: string): Promise<CatalogItem | null> {
  const upstream = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query: PRODUCT_BY_HANDLE_QUERY, variables: { handle: sku } }),
  });
  if (!upstream.ok) return null;
  const json = (await upstream.json()) as any;
  const n = json?.data?.product;
  if (!n) return null;
  const listed = Number(n.priceRange?.minVariantPrice?.amount ?? 0);
  return {
    sku: n.handle,
    title: n.title,
    description: n.description?.slice(0, 200) ?? "",
    priceMinor: (listed * DEMO_SCALE * 1e6).toFixed(0),
    currency: "USDC",
    category: categoryFor(n.title),
  };
}

export const Route = createFileRoute("/api/public/ap2/mandate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const payTo = (process.env["CIRCLE_TREASURY_ADDRESS"] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers: CORS });
        }

        const parsed = Input.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "invalid_request", issues: parsed.error.issues.slice(0, 5) },
            { status: 400, headers: CORS },
          );
        }

        const item = await fetchProduct(parsed.data.sku);
        if (!item) {
          return Response.json({ error: "unknown_sku", sku: parsed.data.sku }, { status: 404, headers: CORS });
        }

        const cart = buildCartMandate(item, parsed.data.quantity, payTo, "streetkode-storefront");
        const total = cart.totals[0]?.value ?? "0";
        const paymentMandate = parsed.data.payer
          ? buildPaymentMandate(cart, parsed.data.payer as `0x${string}`)
          : undefined;

        return Response.json(
          {
            ap2Version: cart.ap2Version,
            cart,
            paymentMandate,
            spendConstraints: buildSpendConstraints({
              agentId: "stylist-agent-01",
              maxPerItemUsdc: 0.25,
              dailyCapUsdc: 1.0,
              confirmAboveUsdc: 0.05,
              allowedCategories: ["sneakers", "headwear", "outerwear", "tops", "bottoms", "accessories"],
            }),
            x402: {
              x402Version: 2,
              accepts: [
                {
                  scheme: "exact",
                  network: ARC_CAIP2,
                  asset: USDC_ARC,
                  amount: total,
                  resource: `sku://${item.sku}`,
                  description: `${parsed.data.quantity} × ${item.title}`,
                  payTo,
                  maxTimeoutSeconds: 300,
                  extra: { chainId: 5042002, sku: item.sku, cartId: cart.cartId },
                },
              ],
            },
          },
          { headers: CORS },
        );
      },
    },
  },
});
