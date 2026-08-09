import { useEffect, useMemo, useState } from "react";
import { Loader2, Bot, ShieldCheck, ScrollText } from "lucide-react";
import { AgentRunPanel } from "@/components/gx/AgentRunPanel";
import type { AgentOrder } from "@/components/gx/useAgentRun";

interface Offer {
  sku: string;
  title: string;
  category: string;
  listed_price: { amount: string; currency: string };
  variants: Array<{ id: string; title: string; available: boolean }>;
  image: string | null;
}

const STEPS = [
  {
    icon: Bot,
    title: "1 · Brief the agent",
    body: "Tell it what you want from the drop. It reads the same catalog a human sees — as typed offers.",
  },
  {
    icon: ShieldCheck,
    title: "2 · Set the guardrails",
    body: "Per-item cap, daily cap, and a threshold above which the agent must stop and ask you first.",
  },
  {
    icon: ScrollText,
    title: "3 · Read the receipt",
    body: "Every discovery, quote, mandate check and USDC settlement on Arc is written to an audit ledger.",
  },
];

export function H2aHome() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

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
        quantity: qty,
        listedAmount: Number(offer.listed_price.amount),
        currency: offer.listed_price.currency,
      }
    : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/30 bg-linear-to-br from-primary/15 via-surface to-black p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-glow">
          Generative Experience · human-to-agent
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-foreground sm:text-4xl">
          You set the budget.<br />The agent does the shopping.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          H2A keeps the human in the loop but off the checkout page. You delegate a purchase, the
          agent negotiates and settles it in USDC on Circle&apos;s Arc Testnet, and it interrupts you
          the moment a spend breaks your policy.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card/70 p-4">
            <s.icon className="h-5 w-5 text-glow" />
            <p className="mt-3 text-sm font-black text-foreground">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

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
        <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-glow">Your brief</p>
            <h3 className="mt-1 text-lg font-black text-foreground">Pick what the agent buys</h3>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {offers.map((o) => (
              <button
                key={o.sku}
                onClick={() => setSelected(o.sku)}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                  o.sku === selected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/60"
                }`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-linear-to-br from-indigo-950 to-indigo-900">
                  {o.image && (
                    <img src={o.image} alt={o.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{o.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {o.listed_price.amount} {o.listed_price.currency}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Quantity
            </span>
            <div className="inline-flex items-center rounded-full border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-sm font-black text-muted-foreground hover:text-foreground"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm font-black text-foreground">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(5, q + 1))}
                className="px-3 py-1.5 text-sm font-black text-muted-foreground hover:text-foreground"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </section>
      )}

      <AgentRunPanel order={order} cta="Delegate this purchase to the agent" />
    </div>
  );
}
