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
import { formatMinor } from "@/lib/fx";
import { usePayToken } from "@/lib/pay-token";
import { useServerFn } from "@tanstack/react-start";
import { fetchFxRates } from "@/lib/fx.functions";
import { accruePayout, listAccruals, listPayouts, settleBatch } from "@/lib/a2h.functions";
import { useWallet } from "@/lib/wallet-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FxRates } from "@/lib/tokens";

const SWEEP_PLAYS = 1000;
const SWEEP_MOVE = "krump-2024-w32";

interface BatchState {
  key: string;
  batchId: string;
  moveCid: string;
  token: string;
  plays: number;
  microUsd: number;
  usd: number;
  count: number;
  thresholdUsd: number;
  ready: boolean;
  progress: number;
}

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
    } catch {
      setChainError("Registry history could not be read from the RPC provider right now.");
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
      approvalMessage(7.5, payToken, fx),
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

      <TreasuryPanel onLowGas={setLowGas} />

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

        {lowGas && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
            Treasury is low on USDC gas, so approvals and sweeps will fail until it is topped up
            at faucet.circle.com (Arc Testnet).
          </p>
        )}

        {chainError && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
            {chainError} Payouts still settle on Arc — new settlements appear here immediately.
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
 * Nanopayments accrue off-chain; one Arc transaction settles the batch.
 * A real agent runs this on a cron — the button lets a judge make it act now.
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
  const accrue = useServerFn(accruePayout);
  const settle = useServerFn(settleBatch);
  const getAccruals = useServerFn(listAccruals);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [busy, setBusy] = useState<"accrue" | "settle" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  function fail(e: unknown, fallback: string) {
    const text = e instanceof Error ? e.message : fallback;
    setRaw(text);
    setShowRaw(false);
    setMsg(shortFailure(text, fallback));
  }


  const load = useCallback(async () => {
    if (!address) return;
    const res = await getAccruals({ data: { address } });
    setBatch(res.batches.find((b) => b.token === token && b.moveCid === SWEEP_MOVE) ?? null);
  }, [getAccruals, address, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSweep() {
    if (!address) return;
    setBusy("accrue");
    setMsg(null);
    setRaw(null);
    try {
      const res = await accrue({
        data: { address, token, moveCid: SWEEP_MOVE, plays: SWEEP_PLAYS },
      });
      setBatch(res.batch);
      setMsg(
        res.batch.ready
          ? `Batch ready — ${res.batch.count} nanopayments worth ${formatMinor(res.batch.microUsd)}.`
          : `Accrued ${SWEEP_PLAYS.toLocaleString()} plays off-chain. No gas spent.`,
      );
    } catch (e) {
      fail(e, "accrue_failed");
    } finally {
      setBusy(null);
    }
  }

  async function runSettle() {
    if (!address) return;
    setBusy("settle");
    setMsg(null);
    setRaw(null);
    try {
      const res = await settle({ data: { address, token, moveCid: SWEEP_MOVE } });
      if (res.ok) {
        setBatch(null);
        setMsg(
          `Settled ${res.count} nanopayments in one tx · ${res.value} ${res.token} · ${res.transferTx.slice(0, 12)}…`,
        );
        await onSettled();
      } else {
        setRaw(res.detail);
        setShowRaw(false);
        setMsg(shortFailure(res.detail, "settle_failed"));
      }
    } catch (e) {
      fail(e, "settle_failed");
    } finally {
      setBusy(null);
    }
  }

  const pct = Math.round((batch?.progress ?? 0) * 100);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Zap className="h-4 w-4 shrink-0 text-glow" />
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
          Each licensed play is worth a fraction of a cent, so the agent accrues nanopayments
          off-chain and settles the whole batch in one Arc transaction. Run a sweep to add{" "}
          {SWEEP_PLAYS.toLocaleString()} plays.
        </p>
        <button
          onClick={() => void runSweep()}
          disabled={!address || busy !== null}
          className="inline-flex items-center gap-2 rounded-full border border-glow/40 bg-glow/10 px-4 py-1.5 text-[11px] font-bold text-glow disabled:opacity-50"
        >
          {busy === "accrue" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {address ? "Run rights sweep" : "Connect wallet first"}
        </button>
      </div>

      {batch && (
        <div className="rounded-lg border border-border bg-background/70 px-3 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Accruing · {batch.moveCid}
            </p>
            <p className="font-mono text-[11px] text-foreground">
              {batch.plays.toLocaleString()} plays · {formatMinor(batch.microUsd)} owed ·{" "}
              {batch.count} nanopayments
            </p>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-glow transition-all"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              {pct}% of the ${batch.thresholdUsd.toFixed(2)} settlement threshold — settles
              automatically at 100%, or force it now.
            </p>
            <button
              onClick={() => void runSettle()}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-glow px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy === "settle" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy === "settle" ? "Settling on Arc…" : "Settle now"}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className="space-y-1">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {msg}
            {raw && raw !== msg && (
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="ml-2 underline underline-offset-2 hover:text-foreground"
              >
                {showRaw ? "Hide details" : "Show details"}
              </button>
            )}
          </p>
          {showRaw && raw && (
            <pre className="max-h-32 overflow-auto rounded-lg border border-border bg-background/70 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
              {raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/** Collapse any provider/RPC failure text into one readable line. */
function shortFailure(text: string, fallback: string): string {
  const t = text.trim();
  if (!t) return "That step failed. Nothing left the treasury — try again.";
  if (/circle_/.test(t) || /API parameter invalid/i.test(t)) {
    return "Circle rejected the request, so nothing left the treasury. Try the sweep again in a moment.";
  }
  if (/rate.?limit|429/i.test(t)) {
    return "The Arc RPC is rate-limiting right now — wait a few seconds and retry.";
  }
  if (/insufficient/i.test(t)) {
    return "The treasury is out of USDC gas. Top it up at faucet.circle.com and retry.";
  }
  if (/timeout/i.test(t)) {
    return "The Arc transaction is still pending at Circle — check the treasury in a moment.";
  }
  if (t.length <= 140 && !t.includes("{")) return t;
  return fallback === "accrue_failed"
    ? "Could not record those plays. Try the sweep again."
    : "Settlement did not go through. Nothing left the treasury — try again.";
}
