import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchFxRates } from "@/lib/fx.functions";
import type { FxRates } from "@/lib/tokens";
import { RefreshCw, AlertCircle, Clock, Database, Key } from "lucide-react";

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function coinGeckoLabel(mode: FxRates["coinGeckoMode"]): string {
  switch (mode) {
    case "demo":
      return "CoinGecko demo";
    case "pro":
      return "CoinGecko Pro";
    case "none":
      return "CoinGecko public";
  }
}

export function FxPriceWidget() {
  const [fx, setFx] = useState<FxRates | null>(null);
  const [now, setNow] = useState(Date.now());
  const getFx = useServerFn(fetchFxRates);

  const load = async () => {
    try {
      const rates = await getFx();
      setFx(rates);
    } catch (err) {
      console.error("[FxPriceWidget] failed to load rates:", err);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      setNow(Date.now());
      // Refresh rates every 60s while the widget is mounted.
      load();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!fx) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Loading FX…
      </div>
    );
  }

  const age = now - fx.cachedAt;
  const stale = fx.stale || age > 5 * 60 * 1000;

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
        stale
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-border bg-surface text-muted-foreground"
      }`}
      title={`Source: ${fx.source} · CoinGecko mode: ${fx.coinGeckoMode}`}
    >
      <span className="inline-flex items-center gap-1">
        <Database className="h-3 w-3" />
        FX rates
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {fx.cachedAt ? formatAge(age) : "—"}
      </span>
      <span className="inline-flex items-center gap-1">
        <Key className="h-3 w-3" />
        {coinGeckoLabel(fx.coinGeckoMode)}
      </span>
      {stale && (
        <span className="inline-flex items-center gap-1 text-amber-200">
          <AlertCircle className="h-3 w-3" />
          Stale
        </span>
      )}
      <button
        type="button"
        onClick={load}
        className="ml-1 inline-flex items-center rounded-full p-0.5 hover:bg-secondary/60 hover:text-foreground"
        aria-label="Refresh FX rates"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  );
}
