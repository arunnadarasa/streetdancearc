import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { listReceipts } from "@/lib/receipts.functions";
import type { ReceiptHistory, RegistryReceipt, ReceiptKind } from "@/lib/receipts.server";
import { TOKENS } from "@/lib/tokens";

const KIND_STYLE: Record<ReceiptKind, string> = {
  payout: "bg-glow/15 text-glow",
  claim: "bg-primary/15 text-primary",
  batch: "bg-amber-500/15 text-amber-400",
  mint: "bg-secondary text-foreground/80",
};

const FILTERS: Array<{ id: "all" | ReceiptKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "mint", label: "Move logs" },
  { id: "payout", label: "A2H payouts" },
  { id: "claim", label: "Claims" },
  { id: "batch", label: "Batches" },
];

function ago(seconds: number) {
  if (!seconds) return "—";
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function short(hash: string) {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : "—";
}

function trimAmount(amount: string, token: keyof typeof TOKENS) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${amount} ${token}`;
  const places = TOKENS[token].decimals === 8 ? 8 : 6;
  return `${n.toFixed(places).replace(/0+$/, "").replace(/\.$/, ".0")} ${TOKENS[token].symbol}`;
}

function StatusPill({ status }: { status: RegistryReceipt["status"] }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Success
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <CircleDashed className="h-3 w-3" /> Pending status
    </span>
  );
}

export function ReceiptHistoryPanel({ className = "" }: { className?: string }) {
  const fetchReceipts = useServerFn(listReceipts);
  const [data, setData] = useState<ReceiptHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ReceiptKind>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReceipts({ data: { limit: 25 } });
      setData(res as ReceiptHistory);
    } catch {
      setData({
        receipts: [],
        registry: "",
        degraded: true,
        detail: "Registry history is unavailable right now. Try again in a moment.",
        scannedBlocks: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchReceipts]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () => (data?.receipts ?? []).filter((r) => filter === "all" || r.kind === filter),
    [data, filter],
  );

  return (
    <div className={`rounded-2xl border border-border bg-card/70 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Receipt history</p>
          <h3 className="display mt-1 text-lg sm:text-xl">Every log() on Arc</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Registry calls across all four modes, newest first, with ArcScan receipts.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {data?.degraded && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          {data.detail}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {loading && !data && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the registry…
          </div>
        )}

        {!loading && rows.length === 0 && !data?.degraded && (
          <p className="py-6 text-sm text-muted-foreground">
            No registry calls in the last {data?.scannedBlocks ?? 0} blocks. Mint a move or run an A2H
            payout and it appears here.
          </p>
        )}

        {rows.map((r) => (
          <div
            key={`${r.txHash}-${r.cid}-${r.blockNumber}`}
            className="rounded-xl border border-border bg-background/40 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLE[r.kind]}`}>
                {r.label}
              </span>
              <StatusPill status={r.status} />
              <span className="ml-auto text-[11px] text-muted-foreground">
                block {r.blockNumber} · {ago(r.atSeconds)}
              </span>
            </div>

            <p className="mt-2 font-semibold text-foreground">{trimAmount(r.amount, r.token)}</p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">cid: {r.cid || "—"}</p>

            <a
              href={r.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 break-all text-xs text-glow hover:underline"
            >
              {short(r.txHash)} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        ))}
      </div>

      {data?.registry && (
        <a
          href={`https://testnet.arcscan.app/address/${data.registry}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Registry contract on ArcScan <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
