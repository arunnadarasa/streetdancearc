import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, type Address } from "viem";
import { toast } from "sonner";
import { Sparkles, Loader2, ShoppingCart, Send, RotateCcw } from "lucide-react";
import { runNegotiation, type NegotiationTurn } from "@/lib/agent-negotiation.functions";
import { AgentChatBubble, type ChatTurn } from "./AgentChatBubble";
import { JsonBlock } from "./JsonBlock";
import { arcTestnet } from "@/lib/arc-chain";
import { DEMO_SCALE } from "@/lib/agent-card";
import {
  STOREFRONT_QUERY,
  SHOPIFY_STOREFRONT_URL,
  SHOPIFY_STOREFRONT_TOKEN,
} from "@/lib/shopify";
import { categoryFor } from "@/routes/api/public/catalog";

function categoryForTitle(title: string): string {
  return categoryFor(title);
}

export function AgentNegotiation() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [goal, setGoal] = useState("Buy a snapback cap under 0.03 USDC for practice sessions");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState<ChatTurn[]>([]);
  const [finalQuote, setFinalQuote] = useState<NegotiationTurn["quote"]>(null);
  const [settling, setSettling] = useState(false);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const negotiate = useServerFn(runNegotiation);

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

  const catalog = useMemo(
    () =>
      products.map((n) => {
        const listed = Number(n.priceRange?.minVariantPrice?.amount ?? 0);
        return {
          sku: n.handle,
          title: n.title,
          description: n.description?.slice(0, 160) ?? "",
          priceMinor: (listed * DEMO_SCALE * 1e6).toFixed(0),
          currency: "USDC",
          category: categoryForTitle(n.title),
        };
      }),
    [products],
  );

  async function onRun() {
    setRunning(true);
    setError(null);
    setReceipt(null);
    setTranscript([]);
    setFinalQuote(null);
    try {
      const result = await negotiate({
        data: {
          goal,
          catalog,
          policy: {
            agentId: "stylist-agent-01",
            maxPerItemUsdc: 0.25,
            dailyCapUsdc: 1.0,
            confirmAboveUsdc: 0.05,
            allowedCategories: ["sneakers", "headwear", "outerwear", "tops", "bottoms", "accessories"],
          },
          turns: 4,
        },
      });
      setTranscript(result.transcript as ChatTurn[]);
      setFinalQuote(result.finalQuote);
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
        agentId: "stylist-agent-01",
      };

      const quoteRes = await fetch("/api/public/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const quote = await quoteRes.json();
      if (quoteRes.status !== 402) throw new Error(`Expected 402, got ${quoteRes.status}: ${JSON.stringify(quote)}`);
      const requirement = quote.accepts[0];

      const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
      if (!embedded) throw new Error("No embedded wallet available.");
      const provider = await embedded.getEthereumProvider();
      await embedded.switchChain(arcTestnet.id);
      const from = embedded.address as Address;
      const walletClient = createWalletClient({
        account: from,
        chain: arcTestnet,
        transport: custom(provider),
      });
      const publicClient = createPublicClient({ chain: arcTestnet, transport: custom(provider) });
      const hash = await walletClient.sendTransaction({
        to: requirement.payTo as Address,
        value: BigInt(requirement.amount),
        chain: arcTestnet,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const xPayment = btoa(JSON.stringify({ txHash: hash, from, nonce: requirement.nonce }));
      const paidRes = await fetch("/api/public/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-PAYMENT": xPayment },
        body: JSON.stringify(body),
      });
      const receiptJson = await paidRes.json();
      if (!paidRes.ok) throw new Error(`Settlement verification failed: ${JSON.stringify(receiptJson)}`);
      setReceipt(receiptJson);
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
      <section className="rounded-3xl border border-primary/30 bg-linear-to-br from-primary/15 via-surface to-black p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-glow">AIsa · A2A · AP2 · UCP</p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-foreground sm:text-4xl">
          Let agents negotiate.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          A buyer agent and a seller agent negotiate a streetwear deal in natural language. The seller
          emits an AP2 cart mandate and an x402 payment requirement. The buyer agent settles on Arc
          Testnet — all visible, all on-chain.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Buyer goal
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
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
        </div>

        {loadingCatalog && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="animate-spin" size={14} /> Loading catalog…
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

          {finalQuote && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-glow">Final deal</p>
                  <p className="text-sm font-bold text-foreground">
                    {finalQuote.quantity} × {finalQuote.title} @ {finalQuote.unitPriceUsdc.toFixed(6)} USDC
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {finalQuote.totalUsdc.toFixed(6)} USDC
                  </p>
                </div>
                <button
                  onClick={onSettle}
                  disabled={settling}
                  className="lift flex items-center justify-center gap-2 rounded-full bg-glow px-6 py-3 text-sm font-black text-glow-foreground disabled:opacity-50"
                >
                  {settling ? <Loader2 className="animate-spin" size={16} /> : <ShoppingCart size={16} />}
                  {settling ? "Settling on Arc…" : authenticated ? "Settle on Arc" : "Sign in to settle"}
                </button>
              </div>
            </div>
          )}

          {!finalQuote && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
              The agents did not reach a deal. Try a different goal or budget.
            </p>
          )}
        </section>
      )}

      {receipt && (
        <section className="space-y-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-400">On-chain receipt</p>
          <JsonBlock label="fulfilment object" value={receipt} tone="green" />
        </section>
      )}
    </div>
  );
}
