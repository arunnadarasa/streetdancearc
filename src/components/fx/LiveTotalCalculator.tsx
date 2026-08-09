import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { usePayToken } from "@/lib/pay-token";
import { fetchFxRates } from "@/lib/fx.functions";
import { TOKENS, convertFromFiat, getTokenUsdRate, formatAmount, toAtomic, type FxRates } from "@/lib/tokens";
import { Loader2 } from "lucide-react";

interface LiveTotalCalculatorProps {
  /** Listed fiat amount (before any demo scaling). */
  fiatAmount: number;
  /** ISO currency code of the listed price, e.g. GBP, USD, EUR. */
  fiatCurrency: string;
  /** Optional scaling factor (e.g. DEMO_SCALE) applied to the fiat amount before conversion. */
  scale?: number;
  /** Additional context line shown under the total. */
  note?: string;
  className?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  USDC: "$",
  EURC: "€",
};

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code.toUpperCase();
}

export function LiveTotalCalculator({
  fiatAmount,
  fiatCurrency,
  scale = 1,
  note,
  className = "",
}: LiveTotalCalculatorProps) {
  const [payToken] = usePayToken();
  const [fx, setFx] = useState<FxRates | null>(null);
  const [loading, setLoading] = useState(false);
  const getFx = useServerFn(fetchFxRates);

  const tokenCfg = TOKENS[payToken];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void getFx({ data: undefined })
      .then((rates) => {
        if (mounted) setFx(rates);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [getFx]);

  const { scaledFiat, usdEquivalent, tokenAmount, atomic, rate } = useMemo(() => {
    const scaled = fiatAmount * scale;
    const usd = convertFromFiat(scaled, fiatCurrency, "USDC", fx);
    const tokenAmt = convertFromFiat(scaled, fiatCurrency, payToken, fx);
    const atomicValue = toAtomic(tokenAmt, payToken);
    const tokenUsdRate = getTokenUsdRate(payToken, fx);
    return {
      scaledFiat: scaled,
      usdEquivalent: usd,
      tokenAmount: tokenAmt,
      atomic: atomicValue,
      rate: tokenUsdRate,
    };
  }, [fiatAmount, fiatCurrency, scale, payToken, fx]);

  const symbol = currencySymbol(fiatCurrency);
  const tokenPlaces = tokenCfg.decimals === 8 ? 8 : 6;

  return (
    <div
      className={`rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Live Midnight total
        </span>
        {loading && !fx ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : fx?.stale ? (
          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
            Fallback
          </span>
        ) : fx ? (
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
            Live FX
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-lg font-black tabular-nums text-foreground">
          {tokenAmount.toFixed(tokenPlaces)} {tokenCfg.symbol}
        </span>
        <span className="text-[11px] text-muted-foreground">
          ≈ {symbol}
          {scaledFiat.toFixed(2)} listed
          {scale !== 1 && (
            <span className="ml-1 text-[10px] opacity-70">(×{scale})</span>
          )}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span>
          1 USD ≈{" "}
          <span className="font-mono font-semibold text-foreground">
            {rate.toPrecision(tokenCfg.decimals === 8 ? 6 : 4)}
          </span>{" "}
          {tokenCfg.symbol}
        </span>
        <span>
          Listed USD:{" "}
          <span className="font-mono font-semibold text-foreground">
            ${usdEquivalent.toFixed(2)}
          </span>
        </span>
        <span className="font-mono text-glow">{formatAmount(atomic, payToken)}</span>
      </div>

      {note && <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">{note}</p>}

      {fx?.stale && (
        <p className="mt-1 text-[10px] leading-snug text-amber-400/90">
          FX feed offline — using fallback rates.
        </p>
      )}
    </div>
  );
}
