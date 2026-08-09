import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/lib/wallet-context";
import { usePayToken } from "@/lib/pay-token";
import { useArcBalances, shortBalance } from "@/lib/use-arc-balances";
import { TOKENS, TOKEN_KEYS, getTokenUsdRate, type FxRates } from "@/lib/tokens";
import { useServerFn } from "@tanstack/react-start";
import { fetchFxRates } from "@/lib/fx.functions";

/**
 * Global settlement-currency pill. The choice applies to every mode: the merch
 * checkout, the delegated agent, the x402 agent-to-agent flow and the payout
 * inbox. Balances are read live off Arc through the same-origin RPC proxy and
 * shared with the header balances panel.
 */
export function PayTokenToggle({ compact = false }: { compact?: boolean }) {
  const [token, setToken] = usePayToken();
  const { user, authenticated } = useWallet();
  const address = user?.wallet?.address;
  const { balances } = useArcBalances(authenticated ? address : undefined);
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

  const active = TOKENS[token];
  const activeBalance = balances[token];
  const empty = authenticated && activeBalance !== undefined && Number(activeBalance ?? 0) === 0;

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Settlement currency: ${active.symbol}`}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border/80 bg-surface/70 px-3 text-[11px] font-bold tracking-wide text-foreground transition hover:bg-secondary"
          >
            {active.symbol}
            {authenticated && activeBalance !== undefined && activeBalance !== null ? (
              <span className="tabular-nums opacity-70">{shortBalance(activeBalance)}</span>
            ) : null}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {TOKEN_KEYS.map((k) => {
            const bal = balances[k];
            return (
              <DropdownMenuItem
                key={k}
                onSelect={() => setToken(k)}
                className={`flex items-center justify-between gap-4 text-xs font-semibold ${
                  k === token ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>{TOKENS[k].symbol}</span>
                <span className="tabular-nums opacity-70">
                  {bal === undefined || bal === null ? "—" : shortBalance(bal)}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-surface/70 p-0.5">

      {TOKEN_KEYS.map((k) => {
        const on = k === token;
        const bal = balances[k];
        const rate = getTokenUsdRate(k, fx);
        return (
          <button
            key={k}
            type="button"
            onClick={() => setToken(k)}
            title={
              bal === undefined || bal === null
                ? `${TOKENS[k].label} — 1 USD ≈ ${rate.toPrecision(4)} ${TOKENS[k].symbol}`
                : `${TOKENS[k].label} — balance ${shortBalance(bal)} ${TOKENS[k].symbol} · 1 USD ≈ ${rate.toPrecision(4)} ${TOKENS[k].symbol}`
            }
            aria-pressed={on}
            className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wide transition sm:px-2.5 sm:text-[11px] ${
              on
                ? "bg-linear-to-r from-primary to-glow text-primary-foreground shadow-glow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TOKENS[k].symbol}
            {on && authenticated ? (
              <span className="ml-1 tabular-nums opacity-90">{shortBalance(bal)}</span>
            ) : bal !== undefined && bal !== null && Number(bal) === 0 ? (
              <span className="ml-0.5 text-[9px] opacity-70">·0</span>
            ) : null}
          </button>
        );
      })}
      <span className="sr-only">
        Settling in {active.symbol}
        {empty ? " — no balance on Arc Testnet" : ""}
      </span>
    </div>
  );
}
