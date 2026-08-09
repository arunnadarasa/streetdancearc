import { useMemo, useState } from "react";
import { ExternalLink, CheckCircle2, XCircle, CircleDashed, RefreshCw } from "lucide-react";
import { INDEXER_URL, TOKENS } from "@/lib/tokens";
import { CONTRACTS } from "@/lib/contracts";
import { useTxLog, type TxEntry, type TxStatus } from "@/lib/tx-log";

type ReceiptKind = "purchase" | "payout" | "claim" | "batch" | "mint";

const KIND_STYLE: Record<ReceiptKind, string> = {
  purchase: "bg-sky-500/15 text-sky-300",
  payout: "bg-glow/15 text-glow",
  claim: "bg-primary/15 text-primary",
  batch: "bg-amber-500/15 text-amber-400",
  mint: "bg-secondary text-foreground/80",
};

const KIND_LABEL: Record<ReceiptKind, string> = {
  purchase: "Purchase",
  payout: "A2H payout",
  claim: "Claim",
  batch: "Batch",
  mint: "Move log",
};

const FILTERS: Array<{ id: "all" | ReceiptKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "purchase", label: "Purchases" },
  { id: "mint", label: "Move logs" },
  { id: "payout", label: "A2H payouts" },
  { id: "claim", label: "Claims" },
  { id: "batch", label: "Batches" },
];

function ago(ms: number) {
  if (!ms) return "—";
  const diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function short(hash: string) {
  const h = hash.replace(/^0x/i, "");
  return h ? `${h.slice(0, 10)}…${h.slice(-8)}` : "—";
}

/** Shop/agent settles → purchase; Prove & append → mint; A2H → payout. */
function kindFromEntry(e: TxEntry): ReceiptKind {
  if (/claim/i.test(e.label)) return "claim";
  if (/batch|nano|sweep/i.test(e.label)) return "batch";
  if (e.mode === "A2H" || /payout|royalty|mandate/i.test(e.label)) return "payout";
  if (/^Move log\b/i.test(e.label)) return "mint";
  if (
    e.mode === "H2A" ||
    e.mode === "A2A" ||
    /purchase|deal|cart checkout/i.test(e.label) ||
    (e.mode === "H2H" && /×\d/.test(e.label))
  ) {
    return "purchase";
  }
  return "mint";
}

function amountLabel(e: TxEntry): string {
  if (e.amountFormatted) return e.amountFormatted;
  if (e.atomic) {
    const n = Number(e.atomic) / 10 ** TOKENS[e.token].decimals;
    if (Number.isFinite(n)) return `${n.toFixed(6)} ${TOKENS[e.token].symbol}`;
  }
  return TOKENS[e.token].symbol;
}

function StatusPill({ status }: { status: TxStatus }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Confirmed
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
      <CircleDashed className="h-3 w-3" /> Pending
    </span>
  );
}

/** Session + mode receipts for Midnight Undeployed (indexer-linked tx log). */
export function ReceiptHistoryPanel({ className = "" }: { className?: string }) {
  const { entries, refresh } = useTxLog();
  const [filter, setFilter] = useState<"all" | ReceiptKind>("all");
  const registry = CONTRACTS.find((c) => c.key === "registry");

  const rows = useMemo(() => {
    return entries
      .map((e) => ({ e, kind: kindFromEntry(e) }))
      .filter(({ kind }) => filter === "all" || kind === filter);
  }, [entries, filter]);

  return (
    <div className={`rounded-2xl border border-border bg-card/70 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Receipt history</p>
          <h3 className="display mt-1 text-lg sm:text-xl">Every append on Midnight</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            MoveRegistry / mUSDC writes from this session across all four modes, newest first, with
            indexer receipts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No Undeployed settlements in this session yet. Prove &amp; append a move, or settle from
            A2H / shop — receipts land here with indexer links.
          </p>
        ) : (
          rows.map(({ e, kind }) => (
            <div key={`${e.hash}-${e.at}`} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLE[kind]}`}>
                  {e.mode} · {KIND_LABEL[kind]}
                </span>
                <StatusPill status={e.status} />
                <span className="ml-auto text-[11px] text-muted-foreground">{ago(e.at)}</span>
              </div>

              <p className="mt-2 font-semibold text-foreground">{e.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{amountLabel(e)}</p>

              <a
                href={e.explorer}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 break-all text-xs text-glow hover:underline"
              >
                {short(e.hash)} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          ))
        )}
      </div>

      <a
        href={registry?.explorerUrl || INDEXER_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        MoveRegistry on the indexer <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
