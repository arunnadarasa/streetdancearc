import { createFileRoute } from "@tanstack/react-router";
import { DEMO_SCALE, USDC_ARC, ARC_CAIP2 } from "@/lib/agent-card";
import {
  SHOPIFY_STOREFRONT_URL,
  SHOPIFY_STOREFRONT_TOKEN,
  STOREFRONT_QUERY,
} from "@/lib/shopify";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function categoryFor(title: string): string {
  const t = title.toLowerCase();
  if (/(sneaker|kick|shoe|trainer)/.test(t)) return "sneakers";
  if (/(snapback|cap|hat|beanie|bandana|durag)/.test(t)) return "headwear";
  if (/(jacket|hoodie|coat|windbreaker)/.test(t)) return "outerwear";
  if (/(tee|t-shirt|shirt|vest|top)/.test(t)) return "tops";
  if (/(trouser|pant|short|jogger)/.test(t)) return "bottoms";
  return "accessories";
}

export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const upstream = await fetch(SHOPIFY_STOREFRONT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
          },
          body: JSON.stringify({ query: STOREFRONT_QUERY, variables: { first: 24 } }),
        });

        if (!upstream.ok) {
          const body = await upstream.text();
          return Response.json(
            { error: "catalog_unavailable", status: upstream.status, detail: body.slice(0, 500) },
            { status: 502, headers: CORS },
          );
        }

        const json = (await upstream.json()) as any;
        const edges: any[] = json?.data?.products?.edges ?? [];

        const offers = edges.map((e) => {
          const n = e.node;
          const variants: any[] = n.variants?.edges ?? [];
          const listed = Number(n.priceRange?.minVariantPrice?.amount ?? 0);
          return {
            type: "offer",
            sku: n.handle,
            title: n.title,
            category: categoryFor(n.title),
            listed_price: {
              amount: listed.toFixed(2),
              currency: n.priceRange?.minVariantPrice?.currencyCode ?? "GBP",
            },
            settlement: {
              network: ARC_CAIP2,
              asset: USDC_ARC,
              symbol: "USDC",
              decimals: 6,
              amount: (listed * DEMO_SCALE).toFixed(6),
              note: `Testnet demo scale ${DEMO_SCALE} × listed price`,
            },
            variants: variants.map((v) => ({
              id: v.node.id,
              title: v.node.title,
              available: v.node.availableForSale,
              price: v.node.price?.amount,
              options: v.node.selectedOptions,
            })),
            image: n.images?.edges?.[0]?.node?.url ?? null,
            purchase: { method: "POST", path: "/api/public/purchase", body: { sku: n.handle, variantId: "<variant id>" } },
          };
        });

        return Response.json(
          {
            type: "catalog",
            merchant: "streetrail-storefront",
            generated_at: new Date().toISOString(),
            count: offers.length,
            offers,
          },
          { headers: { ...CORS, "Cache-Control": "public, max-age=30" } },
        );
      },
    },
  },
});
