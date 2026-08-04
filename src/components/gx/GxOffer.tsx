import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { JsonBlock } from "./JsonBlock";
import { AgentRunPanel } from "./AgentRunPanel";
import type { AgentOrder } from "./useAgentRun";
import { DEMO_SCALE } from "@/lib/agent-card";

function categoryFor(title: string): string {
  const t = title.toLowerCase();
  if (/(sneaker|kick|shoe|trainer)/.test(t)) return "sneakers";
  if (/(snapback|cap|hat|beanie|bandana|durag)/.test(t)) return "headwear";
  if (/(jacket|hoodie|coat|windbreaker)/.test(t)) return "outerwear";
  if (/(tee|t-shirt|shirt|vest|top)/.test(t)) return "tops";
  if (/(trouser|pant|short|jogger)/.test(t)) return "bottoms";
  return "accessories";
}

export function GxOffer({ product }: { product: any }) {
  const variants: any[] = product.variants?.edges ?? [];
  const [variantIdx, setVariantIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const variant = variants[variantIdx]?.node;
  const listedAmount = Number(variant?.price?.amount ?? 0);
  const currency = variant?.price?.currencyCode ?? "GBP";
  const category = categoryFor(product.title);

  const offerJson = useMemo(
    () => ({
      type: "offer",
      sku: product.handle,
      title: product.title,
      category,
      variant: variant
        ? { id: variant.id, title: variant.title, available: variant.availableForSale }
        : null,
      quantity: qty,
      listed_total: { amount: (listedAmount * qty).toFixed(2), currency },
      settlement: {
        network: "eip155:5042002",
        symbol: "USDC",
        amount: (listedAmount * qty * DEMO_SCALE).toFixed(6),
        note: `Testnet demo scale ${DEMO_SCALE} × listed price`,
      },
      purchase: { method: "POST", path: "/api/public/purchase" },
    }),
    [product, variant, qty, listedAmount, currency, category],
  );

  const order: AgentOrder = {
    sku: product.handle,
    title: product.title,
    category,
    variantId: variant?.id,
    quantity: qty,
    listedAmount,
    currency,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/shop" className="text-xs font-bold text-muted-foreground hover:text-foreground">
          ← Catalog
        </Link>
        <span className="font-mono text-[11px] text-muted-foreground">GX · agent view</span>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
        <h1 className="text-xl font-black text-foreground sm:text-2xl">{product.title}</h1>

        {variants.length > 1 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              variant
            </p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v: any, i: number) => (
                <button
                  key={v.node.id}
                  onClick={() => setVariantIdx(i)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold ${
                    i === variantIdx
                      ? "border-primary bg-primary/10 text-glow"
                      : "border-border text-muted-foreground hover:border-neutral-500"
                  }`}
                >
                  {v.node.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            quantity
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-black/40 px-2 py-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-full font-bold text-muted-foreground hover:bg-secondary"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="h-8 w-8 rounded-full font-bold text-muted-foreground hover:bg-secondary"
            >
              +
            </button>
          </div>
        </div>

        <JsonBlock label="offer object" value={offerJson} tone="green" />
      </section>

      <AgentRunPanel order={order} cta={`Run agent task: buy ${qty} × ${product.handle}`} />
    </div>
  );
}
