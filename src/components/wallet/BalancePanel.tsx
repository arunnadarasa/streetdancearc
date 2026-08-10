import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Wallet } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useWallet } from "@/lib/wallet-context";
import { usePayToken } from "@/lib/pay-token";
import { useArcBalances, shortBalance } from "@/lib/use-arc-balances";
import { fetchFxRates } from "@/lib/fx.functions";
import { TOKENS, TOKEN_KEYS, getTokenUsdRate, type FxRates } from "@/lib/tokens";

/**
 * Wallet balances on Arc Testnet for the three settlement tokens. Doubles as
 * the settlement-currency picker: tapping a row switches the active token.
 */
export function BalancePanel({ onClose }: { onClose?: () => void }) {
  const { user, authenticated, login, logout } = useWallet();
  const address = user?.wallet?.address;
  const [token, setToken] = usePayToken();
  const { balances, loading, refresh } = useArcBalances(authenticated ? address : undefined);
  const [fx, setFx] = useState<FxRates | null>(null);
  const getFx = useServerFn(fetchFxRates);

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => {
      mounted = false;
    };
  }, [getFx]);

  if (!authenticated) {
    return (
      <div className="w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" /> Balances
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Sign in to see your USDC, EURC and cirBTC balances on Arc Testnet.
        </p>
        <button
          onClick={() => void login()}
          className="mt-3 w-full rounded-full bg-linear-to-r from-primary to-glow px-4 py-2 text-[11px] font-bold text-primary-foreground"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-elevated">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" /> Arc Testnet balances
        </p>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {loading ? "Reading Arc…" : "Refresh"}
        </button>
      </div>

      {address && (
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{address}</p>
      )}

      <ul className="mt-3 space-y-1.5">
        {TOKEN_KEYS.map((k) => {
          const cfg = TOKENS[k];
          const bal = balances[k];
          const rate = getTokenUsdRate(k, fx);
          const usd = bal === null || bal === undefined ? null : Number(bal) / rate;
          const on = k === token;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => {
                  setToken(k);
                  onClose?.();
                }}
                aria-pressed={on}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  on
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-background/40 hover:border-border/80"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-black text-foreground">{cfg.symbol}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {cfg.label}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-bold tabular-nums text-foreground">
                    {shortBalance(bal)}
                  </span>
                  <span className="block text-[10px] tabular-nums text-muted-foreground">
                    {usd === null ? "—" : `≈ $${usd.toFixed(2)}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Balances read live off Arc Testnet. A dash means the public RPC is rate-limiting history
        reads — try refresh in a moment. Zero balances need a top-up from the Arc faucet.
      </p>

      <button
        onClick={() => void logout()}
        className="mt-3 w-full rounded-full border border-border px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
