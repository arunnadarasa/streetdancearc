import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { getOnChainMetrics } from "@/lib/metrics.functions";
import type { OnChainMetrics } from "@/lib/metrics.server";

/** Static copy shown before the feed resolves or when Arc RPC is unreachable. */
const FALLBACK = [
  { key: "drop", value: "7", label: "Pieces in the current drop", href: null as string | null },
  { key: "tokens", value: "3", label: "Stablecoins accepted at checkout", href: null },
  { key: "x402", value: "x402", label: "Agent checkout, no card needed", href: null },
  { key: "rights", value: "On-chain", label: "Rights record for every move", href: null },
];

export function LiveMetrics() {
  const load = useServerFn(getOnChainMetrics);
  const [data, setData] = useState<OnChainMetrics | null>(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((res) => {
        if (alive) setData(res as OnChainMetrics);
      })
      .catch(() => {
        /* keep the static fallback */
      });
    return () => {
      alive = false;
    };
  }, [load]);

  const live = data?.live ? data.items.filter((i) => i.value !== null) : [];
  const rows = live.length >= 2 ? live.slice(0, 4) : FALLBACK;
  const isLive = live.length >= 2;

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60">
        {rows.map((s) => {
          const body = (
            <>
              <dt className="display text-lg text-foreground sm:text-2xl lg:text-3xl">{s.value}</dt>
              <dd className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground sm:text-xs lg:text-sm">
                <span className="min-w-0">{s.label}</span>
                {s.href ? <ExternalLink className="mt-0.5 size-3 shrink-0 opacity-50" /> : null}
              </dd>
            </>
          );
          const cls =
            "block bg-surface-2/90 px-3.5 py-4 backdrop-blur transition-colors sm:px-6 sm:py-6 lg:px-7 lg:py-8";
          return s.href ? (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className={`${cls} hover:bg-surface-2`}
            >
              {body}
            </a>
          ) : (
            <div key={s.key} className={cls}>
              {body}
            </div>
          );
        })}
      </dl>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span
          className={`inline-block size-1.5 rounded-full ${isLive ? "bg-glow" : "bg-muted-foreground/50"}`}
        />
        {isLive
          ? `Read live from Arc Testnet${data?.scannedBlocks ? ` · last ${data.scannedBlocks.toLocaleString("en-US")} blocks` : ""} · tap a figure for the explorer`
          : "Arc activity feed loading — showing catalogue figures"}
      </p>
    </div>
  );
}
