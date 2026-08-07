import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, RefreshCw, Landmark } from "lucide-react";
import { getPublicConfig } from "@/lib/config.functions";
import { fetchFxRates } from "@/lib/fx.functions";
import { useArcBalances, shortBalance } from "@/lib/use-arc-balances";
import { ARC_EXPLORER, TOKENS, TOKEN_KEYS, getTokenUsdRate, type FxRates } from "@/lib/tokens";

/** Below this much USDC the treasury cannot reliably pay Arc gas. */
export const GAS_FLOOR_USDC = 0.5;

const FAUCET = "https://faucet.circle.com/";

/**
 * The Circle treasury wallet that funds A2H payouts: address, live Arc
 * balances and a low-gas warning so a user can top up before a payout fails.
 */
export function TreasuryPanel({ onLowGas }: { onLowGas?: (low: boolean) => void }) {
  const [address, setAddress] = useState<string | null>(null);
  const [fx, setFx] = useState<FxRates | null>(null);
  const [copied, setCopied] = useState(false);
  const getConfig = useServerFn(getPublicConfig);
  const getFx = useServerFn(fetchFxRates);
  const { balances, loading, refresh } = useArcBalances(address ?? undefined);

  useEffect(() => {
    let mounted = true;
    void getConfig({ data: undefined } as never)
      .then((cfg: { treasuryAddress?: string }) => {
        if (mounted) setAddress(cfg?.treasuryAddress || "");
      })
      .catch(() => {
        if (mounted) setAddress("");
      });
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => {
      mounted = false;
    };
  }, [getConfig, getFx]);

  const usdc = balances.USDC;
  const lowGas = usdc !== null && usdc !== undefined && Number(usdc) < GAS_FLOOR_USDC;

  useEffect(() => {
    onLowGas?.(lowGas);
  }, [lowGas, onLowGas]);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  if (address === null) {
    return (
      <section className="rounded-2xl border border-border bg-card/70 p-5">
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the treasury…
        </p>
      </section>
    );
  }

  if (address === "") {
    return (
      <section className="rounded-2xl border border-border bg-card/70 p-5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          No Circle treasury wallet is configured for this build, so agent payouts run in
          demo mode only.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-glow" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-glow">
              Circle treasury · Arc Testnet
            </p>
            <h3 className="mt-1 text-lg font-black text-foreground">Who actually pays you</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                <span className="truncate">
                  {address.slice(0, 10)}…{address.slice(-8)}
                </span>
                {copied ? (
                  <Check className="h-3 w-3 shrink-0 text-primary" />
                ) : (
                  <Copy className="h-3 w-3 shrink-0" />
                )}
              </button>
              <a
                href={`${ARC_EXPLORER}/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                Arcscan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {loading ? "Reading" : "Refresh"}
        </button>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {TOKEN_KEYS.map((k) => {
          const cfg = TOKENS[k];
          const bal = balances[k];
          const rate = getTokenUsdRate(k, fx);
          const usd = bal === null || bal === undefined ? null : Number(bal) / rate;
          return (
            <li
              key={k}
              className="rounded-xl border border-border bg-background/40 px-3 py-2.5"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                {cfg.symbol}
                {k === "USDC" ? " · gas" : ""}
              </p>
              <p className="mt-0.5 text-base font-black tabular-nums text-foreground">
                {shortBalance(bal)}
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {usd === null ? "—" : `≈ $${usd.toFixed(2)}`}
              </p>
            </li>
          );
        })}
      </ul>

      {lowGas && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Treasury is low on USDC gas — payouts will fail. Top up at{" "}
            <a href={FAUCET} target="_blank" rel="noreferrer" className="underline">
              faucet.circle.com
            </a>{" "}
            (pick Arc Testnet) and retry.
          </span>
        </p>
      )}
    </section>
  );
}
