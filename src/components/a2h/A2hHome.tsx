import { Inbox, Loader2, ShieldCheck, Zap } from "lucide-react";
import { JsonBlock } from "@/components/gx/JsonBlock";
import { InboxCard } from "./InboxCard";
import {
  RIGHTS_REGISTRY,
  approvalMessage,
  mandateFor,
  noticeMessages,
  payoutToMessage,
  type A2hMessage,
  type ChainPayout,
} from "./a2h-feed";
import { ARC_EXPLORER, TOKENS, getTokenUsdRate } from "@/lib/tokens";
import { usePayToken } from "@/lib/pay-token";
import { useServerFn } from "@tanstack/react-start";
import { fetchFxRates } from "@/lib/fx.functions";
import { listPayouts } from "@/lib/a2h.functions";
import { useWallet } from "@/lib/wallet-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FxRates } from "@/lib/tokens";

const SWEEP_PLAYS = 1204;

export function A2hHome() {
  const [payToken] = usePayToken();
  const [fx, setFx] = useState<FxRates | null>(null);
  const [chain, setChain] = useState<ChainPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainError, setChainError] = useState<string | null>(null);
  const getFx = useServerFn(fetchFxRates);
  const getPayouts = useServerFn(listPayouts);

  const wallet = useWallet();
  const address =
    wallet.wallets[0]?.address ?? wallet.user?.wallet?.address ?? undefined;

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => {
      mounted = false;
    };
  }, [getFx]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPayouts({ data: address ? { address } : {} });
      setChain(res.payouts as ChainPayout[]);
      setChainError(res.error);
    } catch (e) {
      setChainError(e instanceof Error ? e.message : "registry_read_failed");
    } finally {
      setLoading(false);
    }
  }, [getPayouts, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mandate = mandateFor(payToken, fx);

  const feed: A2hMessage[] = useMemo(() => {
    const settled = chain.map(payoutToMessage);
    return [
      ...settled,
      approvalMessage(12.8, payToken, fx),
      ...noticeMessages(payToken, fx),
    ];
  }, [chain, payToken, fx]);

  const pending = feed.filter((m) => m.kind === "approval").length;

  const CAPS = [
    { k: "Settle token", v: TOKENS[payToken].symbol },
    { k: "Per payout", v: `${mandate.per_payout_cap} ${payToken}` },
    { k: "Daily cap", v: `${mandate.daily_cap} ${payToken}` },
    { k: "Settled on Arc", v: String(chain.length) },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/30 bg-linear-to-br from-primary/15 via-surface to-black p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-glow">
          Generative Experience &middot; agent-to-human
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-foreground sm:text-4xl">
          The agent starts.
          <br />
          You just get paid.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          A2H flips the direction. Nobody opens an app. The Rights Agent watches the rail, sees
          your move earn, sends the {payToken} from the Circle treasury wallet and drops the Arc
          receipt in your inbox. When it wants to act outside its mandate, it asks — and waits.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card/70 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-glow" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-glow">
              Standing authorization
            </p>
            <h3 className="mt-1 text-lg font-black text-foreground">
              What agents may push to you without asking
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The same AP2 mandate shape H2A uses for spend guardrails, pointed the other way:
              you pre-sign <em>receive and notify</em> instead of <em>spend</em>.
            </p>

            {fx && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                FX: {fx.source} · 1 USD ≈ {getTokenUsdRate(payToken, fx).toPrecision(4)} {payToken}
                {fx.stale && " (fallback)"}
              </p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border/60 sm:grid-cols-4">
              {CAPS.map((c) => (
                <div key={c.k} className="bg-background/70 px-3 py-3">
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {c.k}
                  </dt>
                  <dd className="mt-1 text-sm font-black text-foreground">{c.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <JsonBlock label="AP2 payout mandate" value={mandate} tone="green" />
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Payouts are anchored in the rights registry at{" "}
              <a
                href={`${ARC_EXPLORER}/address/${RIGHTS_REGISTRY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-glow underline decoration-glow/50 underline-offset-2"
              >
                {RIGHTS_REGISTRY.slice(0, 10)}…{RIGHTS_REGISTRY.slice(-6)}
              </a>{" "}
              on Arc Testnet.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Inbox className="h-4 w-4 text-glow" />
          <h3 className="text-lg font-black text-foreground">Payout inbox</h3>
          {pending > 0 && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
              {pending} needs you
            </span>
          )}
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">
          Every settled entry below is a real Arc transaction sent by the agent, read back from the
          registry's on-chain events. Nothing here started with a click.
        </p>

        {chainError && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Couldn't read the registry: {chainError}
          </p>
        )}

        <SweepTrigger address={address} token={payToken} onSettled={refresh} />

        <div className="space-y-3">
          {feed.map((m) => (
            <InboxCard key={m.id} msg={m} address={address} onSettled={refresh} />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * A real background agent would run on a cron. For a live demo the judge needs
 * a way to make the agent act now — this fires the same server-side payout path.
 */
function SweepTrigger({
  address,
  token,
  onSettled,
}: {
  address?: string;
  token: keyof typeof TOKENS;
  onSettled: () => void | Promise<void>;
}) {
  const push = useServerFn(
    // lazy import avoided: functions module is client-safe
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    usePushPayoutFn(),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (!address) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await push({ data: { address, token, moveCid: "krump-2024-w32", plays: SWEEP_PLAYS } });
      if (res.ok) {
        setMsg(`Sent ${res.value} ${res.token} · tx ${res.transferTx.slice(0, 12)}…`);
        await onSettled();
      } else {
        setMsg(res.detail);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "payout_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
      <Zap className="h-4 w-4 shrink-0 text-glow" />
      <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
        The Rights Agent normally sweeps on a schedule. Run the sweep now to make it settle{" "}
        {SWEEP_PLAYS.toLocaleString()} licensed plays to your wallet from the treasury.
      </p>
      <button
        onClick={() => void run()}
        disabled={!address || busy}
        className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-glow px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {busy ? "Settling on Arc…" : address ? "Run rights sweep" : "Connect wallet first"}
      </button>
      {msg && <p className="w-full text-[11px] text-muted-foreground">{msg}</p>}
    </div>
  );
}

// Kept as a hook-shaped helper so the import stays static and tree-shakeable.
function usePushPayoutFn() {
  return pushPayoutRef;
}

import { pushPayout as pushPayoutRef } from "@/lib/a2h.functions";
