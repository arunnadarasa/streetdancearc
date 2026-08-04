import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { JsonBlock } from "./JsonBlock";
import { AgentRunPanel } from "./AgentRunPanel";
import type { AgentOrder } from "./useAgentRun";

interface Offer {
  sku: string;
  title: string;
  category: string;
  listed_price: { amount: string; currency: string };
  settlement: { amount: string; symbol: string; note: string };
  variants: Array<{ id: string; title: string; available: boolean }>;
  image: string | null;
}

export function GxShop() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/catalog")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        return json;
      })
      .then((j) => {
        setOffers(j.offers ?? []);
        setSelected(j.offers?.[0]?.sku ?? null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const offer = useMemo(() => offers.find((o) => o.sku === selected) ?? null, [offers, selected]);

  const order: AgentOrder | null = offer
    ? {
        sku: offer.sku,
        title: offer.title,
        category: offer.category,
        variantId: offer.variants.find((v) => v.available)?.id ?? offer.variants[0]?.id,
        quantity: 1,
        listedAmount: Number(offer.listed_price.amount),
        currency: offer.listed_price.currency,
      }
    : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-surface to-black p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-glow">
          GET /api/public/catalog
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-foreground sm:text-3xl">
          The storefront, as an agent reads it
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Same Shopify inventory as H2H mode — no product photography, no hero copy. Each SKU is a
          typed offer carrying availability, listed price, and the exact USDC amount and Arc address
          that settles it.
        </p>
      </section>

      {loading && (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-glow" />
        </div>
      )}

      {err && (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 text-xs text-red-300">
          Catalog unavailable: {err}
        </p>
      )}

      {!loading && offers.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {offers.map((o) => (
              <button
                key={o.sku}
                onClick={() => setSelected(o.sku)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold transition ${
                  o.sku === selected
                    ? "border-primary bg-primary/10 text-glow"
                    : "border-border text-muted-foreground hover:border-neutral-500"
                }`}
              >
                {o.sku}
              </button>
            ))}
          </div>

          {offer && (
            <section className="space-y-3 rounded-2xl border border-border bg-card/70 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-black text-foreground">{offer.title}</h3>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {offer.category}
                </span>
              </div>
              <JsonBlock
                label="offer object"
                value={{
                  ...offer,
                  variants: offer.variants.slice(0, 3).map((v) => ({
                    id: v.id,
                    title: v.title,
                    available: v.available,
                  })),
                  ...(offer.variants.length > 3
                    ? { variants_truncated: `+${offer.variants.length - 3} more via /api/public/catalog` }
                    : {}),
                }}
                tone="green"
              />

            </section>
          )}

          <AgentRunPanel
            order={order}
            cta={order ? `Run agent task: buy ${order.sku}` : "Select an offer"}
          />
        </>
      )}
    </div>
  );
}
