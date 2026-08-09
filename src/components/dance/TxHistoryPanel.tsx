import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, RefreshCw, Trash2, XCircle } from "lucide-react";
import { formatAmount, TOKENS } from "@/lib/tokens";
import { fetchTxStatuses } from "@/lib/tx-status.functions";
import { setSettlementStatus, useTxLog, type TxEntry, type TxMode } from "@/lib/tx-log";

const PAGE_SIZE = 10;

const MODE_TINT: Record<TxMode, string> = {
  H2H: "border-primary/40 bg-primary/10 text-foreground",
  H2A: "border-glow/40 bg-glow/10 text-foreground",
  A2A: "border-amber-400/40 bg-amber-400/10 text-foreground",
  A2H: "border-emerald-400/40 bg-emerald-400/10 text-foreground",
};

function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function short(v?: string): string {
  if (!v) return "—";
  return v.length > 14 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v;
}

function amountOf(e: TxEntry): string {
  if (e.atomic) {
    try {
      return formatAmount(BigInt(e.atomic), e.token);
    } catch {
      /* fall through to the pre-formatted value */
    }
  }
  return e.amountFormatted ?? `— ${TOKENS[e.token]?.symbol ?? ""}`;
}

function StatusChip({ status }: { status: TxEntry["status"] }) {
  const map = {
    success: { Icon: CheckCircle2, tint: "text-emerald-400", label: "Confirmed" },
    failed: { Icon: XCircle, tint: "text-destructive", label: "Failed" },
    pending: { Icon: Clock, tint: "text-amber-400", label: "Pending" },
  } as const;
  const { Icon, tint, label } = map[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] ${tint}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/**
 * Judge-facing list of everything this browser settled on Arc — mode, item,
 * amount, counterparty, and the Arcscan receipt.
 */
export function TxHistoryPanel({
  mode,
  title = "Settled on Arc",
  blurb,
  limit,
}: {
  mode?: TxMode;
  title?: string;
  blurb?: string;
  limit?: number;
}) {
  const { entries, clear } = useTxLog(mode);
  const getStatuses = useServerFn(fetchTxStatuses);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  const rows = useMemo(() => {
    if (limit) return entries.slice(0, limit);
    return entries.slice(start, end);
  }, [entries, limit, start, end]);

  // Reset to first page when the data set shrinks or the filter changes.
  useEffect(() => {
    setPage(1);
  }, [mode, entries.length]);

  const sync = useCallback(async () => {
    const pending = entries.filter((e) => e.status === "pending").map((e) => e.hash);
    if (pending.length === 0) return;
    setChecking(true);
    try {
      const res = await getStatuses({ data: { hashes: pending } });
      for (const r of res.results) setSettlementStatus(r.hash, r.status);
    } catch {
      /* explorer hiccup — rows stay pending and can be retried */
    } finally {
      setChecking(false);
    }
  }, [entries, getStatuses]);

  useEffect(() => {
    void sync();
    // Intentionally mount-only: manual refresh handles later checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copy(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(hash);
      window.setTimeout(() => setCopied((c) => (c === hash ? null : c)), 1500);
    } catch {
      /* clipboard blocked — the Arcscan link still works */
    }
  }

  return (
    <div className="min-w-0 rounded-3xl border border-border bg-card/70 p-4 sm:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="display text-lg text-foreground sm:text-xl">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {blurb ??
              "Every transfer this browser settled on Arc Testnet, newest first. Each row links to the Arcscan receipt."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void sync()}
            disabled={checking}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 text-[11px] font-bold text-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 text-[11px] font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
          No settlements yet — buy something in the shop or run a mode.
        </p>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {rows.map((e) => (
            <li
              key={e.hash}
              className="min-w-0 rounded-2xl border border-border bg-background/50 p-3 sm:p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${MODE_TINT[e.mode]}`}
                >
                  {e.mode}
                </span>
                <StatusChip status={e.status} />
                <span className="text-[10px] text-muted-foreground">{ago(e.at)}</span>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{e.label}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    to {short(e.to)} · {short(e.hash)}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm font-black text-foreground sm:text-right">
                  {amountOf(e)}
                </p>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <a
                  href={e.explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:bg-primary/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Arcscan
                </a>
                <button
                  type="button"
                  onClick={() => void copy(e.hash)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === e.hash ? "Copied" : "Copy hash"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
