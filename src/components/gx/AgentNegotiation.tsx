import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useWallet } from "@/lib/wallet-context";
import type { Address } from "viem";
import { toast } from "sonner";
import { Sparkles, Loader2, ShoppingCart, Send, RotateCcw, Braces, ChevronRight } from "lucide-react";
import { runNegotiation, type NegotiationTurn } from "@/lib/agent-negotiation.functions";
import { AgentChatBubble, type ChatTurn } from "./AgentChatBubble";
import { JsonBlock } from "./JsonBlock";
import { DEMO_SCALE } from "@/lib/agent-card";
import { usePayToken } from "@/lib/pay-token";
import { settleOnArc } from "@/lib/settle";
import { recordSettlement } from "@/lib/tx-log";
import { TOKENS, getTokenUsdRate, type FxRates } from "@/lib/tokens";
import {
  STOREFRONT_QUERY,
  SHOPIFY_STOREFRONT_URL,
  SHOPIFY_STOREFRONT_TOKEN,
} from "@/lib/shopify";
import { categoryFor } from "@/routes/api/public/catalog";
import { fetchFxRates } from "@/lib/fx.functions";
import { deriveBudget, displayBudget, recommendedGoal } from "@/lib/negotiation-budget";

import { payWithNanopayments } from "@/lib/circle-rails.functions";
import { CircleRailsPanel } from "./CircleRailsPanel";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { ReceiptButton } from "./ReceiptButton";

/** Reference material stays one click away instead of between the run and its receipt. */
function Disclosure({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function explorerUrl(value: unknown): string | null {
  try {
    const match = JSON.stringify(value)?.match(/https?:\/\/[^\s"'<>)\]]*\/tx\/[^\s"'<>)\]]+/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

function categoryForTitle(title: string): string {
  return categoryFor(title);

}

const SPEND_POLICY = {
  agentId: "stylist-agent-01",
  maxPerItemUsdc: 0.25,
  dailyCapUsdc: 1.0,
  confirmAboveUsdc: 0.05,
  allowedCategories: ["sneakers", "headwear", "outerwear", "tops", "bottoms", "accessories"],
};

export function AgentNegotiation() {
  const { authenticated, login, wallets } = useWallet();
  const [payToken] = usePayToken();

  const [goal, setGoal] = useState("Buy a snapback cap in the selected stablecoin for practice sessions");
  const goalDirty = useRef(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState<ChatTurn[]>([]);
  const [finalQuote, setFinalQuote] = useState<NegotiationTurn["quote"]>(null);
  const [noDealReason, setNoDealReason] = useState<string>("");


  const [settling, setSettling] = useState(false);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [rawReceipt, setRawReceipt] = useState(false);
  const dealRef = useRef<HTMLElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fx, setFx] = useState<FxRates | null>(null);
  const [nanoNote, setNanoNote] = useState<string | null>(null);

  const negotiate = useServerFn(runNegotiation);
  const getFx = useServerFn(fetchFxRates);
  const nanopay = useServerFn(payWithNanopayments);

  useEffect(() => {
    fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: STOREFRONT_QUERY, variables: { first: 24 } }),
    })
      .then((r) => r.json())
      .then((json: any) => {
        setProducts((json?.data?.products?.edges ?? []).map((e: any) => e.node));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingCatalog(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => { mounted = false; };
  }, [getFx]);

  const catalog = useMemo(
    () =>
      products.map((n) => {
        const listed = Number(n.priceRange?.minVariantPrice?.amount ?? 0);
        const currency = n.priceRange?.minVariantPrice?.currencyCode ?? "GBP";
        // priceMinor is always expressed in USD minor units (6 decimals) so the
        // seller prompt can reason in USDC regardless of the settlement token.
        const priceMinor = (listed * DEMO_SCALE * (fx?.usdPerGbp ?? 1.27) * 1e6).toFixed(0);
        return {
          sku: n.handle,
          title: n.title,
          description: n.description?.slice(0, 160) ?? "",
          priceMinor,
          currency: "USDC",
          category: categoryForTitle(n.title),
        };
      }),
    [products, fx],
  );

  const recommendedBudget = useMemo(
    () => (catalog.length > 0 ? deriveBudget(catalog, SPEND_POLICY) : null),
    [catalog],
  );
  const suggestedGoal = useMemo(
    () => (catalog.length > 0 ? recommendedGoal(catalog, SPEND_POLICY) : null),
    [catalog],
  );

  // Prefill the goal with the catalog-derived budget until the user edits it.
  useEffect(() => {
    if (!suggestedGoal || goalDirty.current) return;
    setGoal(suggestedGoal);
  }, [suggestedGoal]);

  async function onRun() {
    setRunning(true);
    setError(null);
    setReceipt(null);
    setTranscript([]);
    setFinalQuote(null);
    setNoDealReason("");
    try {
      const result = await negotiate({
        data: {
          goal,
          catalog,
          policy: SPEND_POLICY,
          turns: 5,
        },
      });

      setTranscript(result.transcript as ChatTurn[]);
      setFinalQuote(result.finalQuote);
      setNoDealReason(result.reason ?? "");

    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function onSettle() {
    if (!authenticated) {
      await login();
      return;
    }
    if (!finalQuote) return;
    const product = products.find((p) => p.handle === finalQuote.sku);
    if (!product) {
      toast.error("Product not found");
      return;
    }
    const variant = product.variants?.edges?.[0]?.node;
    const listedAmount = Number(variant?.price?.amount ?? 0);
    const currency = variant?.price?.currencyCode ?? "GBP";

    setSettling(true);
    setError(null);
    try {
      const body = {
        sku: finalQuote.sku,
        variantId: variant?.id,
        quantity: finalQuote.quantity,
        listedAmount,
        currency,
        token: payToken,
        agentId: "stylist-agent-01",
      };

      const quoteRes = await fetch("/api/public/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const quote = await quoteRes.json();
      if (quoteRes.status !== 402) throw new Error(`Expected 402, got ${quoteRes.status}: ${JSON.stringify(quote)}`);
      // The merchant quotes all three stablecoins; take the selected one.
      const requirement =
        quote.accepts.find((a: { symbol?: string }) => a.symbol === payToken) ?? quote.accepts[0];

      // Preferred path: Circle Nanopayments (Gateway batching). If the resource
      // or the agent's Gateway balance is not ready, fall through to a direct
      // Arc transfer so the demo never dead-ends.
      setNanoNote("Trying Circle Nanopayments (Gateway batching)…");
      const nano = await nanopay({ data: { url: "/api/public/purchase", body } }).catch(() => null);
      setNanoNote(
        nano && !nano.simulated
          ? `Batched via Circle Nanopayments · transfer ${nano.transferId ?? "pending"}`
          : `Circle Nanopayments unavailable (${nano?.reason ?? "no response"}) — settling directly on Arc.`,
      );

      const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
      if (!embedded?.address) throw new Error("No embedded wallet available.");
      const settled = await settleOnArc(
        embedded as Parameters<typeof settleOnArc>[0],
        payToken,
        requirement.payTo as Address,
        BigInt(requirement.amount),
      );
      const { hash, from } = settled;
      recordSettlement({
        hash,
        mode: "A2A",
        label: `Agent deal · ${finalQuote.sku} ×${finalQuote.quantity}`,
        token: payToken,
        atomic: String(requirement.amount),
        to: requirement.payTo,
        from,
      });


      const xPayment = btoa(JSON.stringify({ txHash: hash, from, nonce: requirement.nonce }));
      const paidRes = await fetch("/api/public/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-PAYMENT": xPayment },
        body: JSON.stringify(body),
      });
      const receiptJson = await paidRes.json();
      if (!paidRes.ok) throw new Error(`Settlement verification failed: ${JSON.stringify(receiptJson)}`);
      setReceipt(receiptJson);
      window.setTimeout(
        () => dealRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
        80,
      );
      toast.success("Agent deal settled on Arc", { description: receiptJson.order_id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error("Settlement failed", { description: msg });
    } finally {
      setSettling(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/30 bg-linear-to-br from-primary/15 via-surface to-black p-6 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-glow">AIsa · A2A · AP2 · UCP</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl">
              Let agents negotiate.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              A buyer agent and a seller agent negotiate a streetwear deal in natural language. The seller
              emits an AP2 cart mandate and an x402 payment requirement. The buyer agent settles on Arc
              Testnet — all visible, all on-chain.
            </p>
          </div>
          <ul className="hidden gap-2 lg:grid">
            {[
              ["A2A 0.3", "message/send task loop"],
              ["AP2", "signed cart mandate"],
              ["x402", "402 challenge + settle"],
              ["Arc", "on-chain receipt"],
            ].map(([k, v]) => (
              <li
                key={k}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-2.5 backdrop-blur"
              >
                <span className="text-xs font-black tracking-wide text-foreground">{k}</span>
                <span className="text-[11px] text-muted-foreground">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Buyer goal
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={goal}
                  onChange={(e) => {
                    goalDirty.current = true;
                    setGoal(e.target.value);
                  }}
                  disabled={running}
                  className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="What should the buyer agent look for?"
                />
                <button
                  onClick={onRun}
                  disabled={running || loadingCatalog || catalog.length === 0}
                  className="lift flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
                >
                  {running ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  <span className="hidden sm:inline">{running ? "Negotiating…" : "Run agents"}</span>
                </button>
              </div>
              {recommendedBudget !== null && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    Recommended budget {displayBudget(recommendedBudget)} USDC — derived from the live catalog
                  </span>
                  {suggestedGoal && goal !== suggestedGoal && !running && (
                    <button
                      type="button"
                      onClick={() => {
                        goalDirty.current = false;
                        setGoal(suggestedGoal);
                      }}
                      className="font-bold text-primary underline underline-offset-2"
                    >
                      Reset to recommended
                    </button>
                  )}
                </p>
              )}
            </div>


            {loadingCatalog && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="animate-spin" size={14} /> Loading catalog…
              </p>
            )}

            {fx && (
              <p className="text-[11px] text-muted-foreground">
                FX: {fx.source} · 1 GBP ≈ {fx.usdPerGbp.toFixed(4)} USD · 1 EUR ≈ {fx.usdPerEur.toFixed(4)} USD
                {fx.stale && " (fallback)"}
              </p>
            )}

            {error && (
              <p className="rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-xs text-red-300">
                {error}
              </p>
            )}
          </section>

          {transcript.length > 0 && (
            <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-glow">Negotiation transcript</p>
                <button
                  onClick={onRun}
                  disabled={running}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-muted-foreground hover:bg-secondary"
                >
                  <RotateCcw size={12} /> Rerun
                </button>
              </div>
              <div className="space-y-4">
                {transcript.map((turn, i) => (
                  <AgentChatBubble key={i} turn={turn} />
                ))}
              </div>

              {!finalQuote && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
                  No deal. {noDealReason || "Try a different goal or budget."}
                </p>
              )}

            </section>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-28">
          <section
            ref={dealRef}
            className={`space-y-3 rounded-2xl border p-5 ${
              receipt
                ? "border-green-500/40 bg-green-500/5"
                : finalQuote
                  ? "border-primary/30 bg-primary/10"
                  : "border-dashed border-border bg-card/40"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                  receipt
                    ? "border-green-500/50 bg-green-500/10 text-green-300"
                    : finalQuote
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : running
                        ? "border-glow/50 bg-glow/10 text-glow"
                        : "border-border bg-background/60 text-muted-foreground"
                }`}
              >
                {running && <Loader2 className="h-3 w-3 animate-spin" />}
                {receipt
                  ? "Settled on Arc"
                  : finalQuote
                    ? "Deal agreed"
                    : running
                      ? "Agents negotiating"
                      : "No deal yet"}
              </span>
              {receipt && (
                <button
                  type="button"
                  onClick={() => setRawReceipt((v) => !v)}
                  aria-pressed={rawReceipt}
                  className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                    rawReceipt
                      ? "border-glow/50 bg-glow/10 text-foreground"
                      : "border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Braces className="h-3.5 w-3.5" />
                  {rawReceipt ? "Hide raw JSON" : "Raw JSON"}
                </button>
              )}
            </div>

            {finalQuote ? (
              <>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {finalQuote.quantity} × {finalQuote.title} @{" "}
                    {(finalQuote.unitPriceUsdc * getTokenUsdRate(payToken, fx)).toFixed(6)} {payToken}
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {(finalQuote.totalUsdc * getTokenUsdRate(payToken, fx)).toFixed(6)} {payToken}
                  </p>
                </div>
                {!receipt && (
                  <button
                    onClick={onSettle}
                    disabled={settling}
                    className="lift flex w-full items-center justify-center gap-2 rounded-full bg-glow px-6 py-3 text-sm font-black text-glow-foreground disabled:opacity-50"
                  >
                    {settling ? <Loader2 className="animate-spin" size={16} /> : <ShoppingCart size={16} />}
                    {settling ? "Settling on Arc…" : authenticated ? "Settle on Arc" : "Sign in to settle"}
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                Run the agents, then settle the deal — the Arc transaction receipt appears right here and
                stays pinned while you scroll the transcript.
              </p>
            )}

            {receipt && (
              <div className="space-y-3">
                {explorerUrl(receipt) && <ReceiptButton href={explorerUrl(receipt)!} />}
                <JsonBlock
                  key={rawReceipt ? "open" : "closed"}
                  label="fulfilment object"
                  value={receipt}
                  tone="green"
                  collapsible
                  defaultOpen={rawReceipt}
                />
              </div>
            )}
          </section>

          {nanoNote && (
            <p className="rounded-xl border border-glow/30 bg-glow/5 px-4 py-3 text-[11px] leading-relaxed text-glow">
              {nanoNote}
            </p>
          )}

          <div className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Under the hood
            </p>
            <Disclosure label="Agent marketplace discovery" defaultOpen={!finalQuote && !receipt}>
              <DiscoveryPanel />
            </Disclosure>
            <Disclosure label="Circle rails">
              <CircleRailsPanel />
            </Disclosure>
          </div>
        </div>

      </div>
    </div>
  );
}

