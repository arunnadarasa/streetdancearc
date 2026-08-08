import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  XCircle,
} from "lucide-react";
import { listMarketActivity } from "@/lib/market.functions";
import type { ActivityKind, MarketActivity, MarketActivityEvent } from "@/lib/market-activity.server";
import { useWallet } from "@/lib/wallet-context";

const KIND_STYLE: Record<ActivityKind, string> = {
  listed: "bg-primary/15 text-primary",
  sold: "bg-glow/15 text-glow",
  cancelled: "bg-secondary text-muted-foreground",
  transfer: "bg-amber-500/15 text-amber-400",
  mint: "bg-emerald-500/15 text-emerald-400",
};

const FILTERS: Array<{ id: "all" | ActivityKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "listed", label: "Listed" },
  { id: "sold", label: "Sold" },
  { id: "cancelled", label: "Cancelled" },
  { id: "transfer", label: "Transfers" },
  { id: "mint", label: "Mints" },
];

function short(a: string | null) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function shortHash(h: string) {
  return h ? `${h.slice(0, 10)}…${h.slice(-8)}` : "—";
}

function shortCid(cid: string) {
  return cid.length > 24 ? `${cid.slice(0, 12)}…${cid.slice(-8)}` : cid;
}

function KindIcon({ kind }: { kind: ActivityKind }) {
  if (kind === "listed" || kind === "cancelled") return <Tag className="h-3.5 w-3.5" aria-hidden />;
  if (kind === "sold") return <Sparkles className="h-3.5 w-3.5" aria-hidden />;
  if (kind === "mint") return <Sparkles className="h-3.5 w-3.5" aria-hidden />;
  return <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />;
}

function StatusPill({ status }: { status: MarketActivityEvent["status"] }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> Success
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
        <XCircle className="h-3 w-3" aria-hidden /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <CircleDashed className="h-3 w-3" aria-hidden /> Confirmed
    </span>
  );
}

/** Plain-English one-liner for a row, written from the connected wallet's view. */
function summarise(e: MarketActivityEvent, me: string): string {
  const mine = (a: string | null) => Boolean(a && me && a.toLowerCase() === me.toLowerCase());
  const move = `move #${e.tokenId}`;
  const amount = e.price && e.symbol ? `${e.price} ${e.symbol}` : null;

  switch (e.kind) {
    case "listed":
      return mine(e.from)
        ? `You listed ${move}${amount ? ` for ${amount}` : ""}`
        : `${short(e.from)} listed ${move}${amount ? ` for ${amount}` : ""}`;
    case "cancelled":
      return mine(e.from) ? `You cancelled the listing for ${move}` : `${short(e.from)} cancelled the listing for ${move}`;
    case "sold":
      if (mine(e.to)) return `You bought ${move} from ${short(e.from)}${amount ? ` for ${amount}` : ""}`;
      if (mine(e.from)) return `You sold ${move} to ${short(e.to)}${amount ? ` for ${amount}` : ""}`;
      return `${short(e.to)} bought ${move} from ${short(e.from)}${amount ? ` for ${amount}` : ""}`;
    case "mint":
      return mine(e.to) ? `You minted ${move}` : `${short(e.to)} minted ${move}`;
    default:
      if (mine(e.from)) return `You transferred ${move} to ${short(e.to)}`;
      if (mine(e.to)) return `You received ${move} from ${short(e.from)}`;
      return `${short(e.from)} transferred ${move} to ${short(e.to)}`;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked — the full value is still visible in the link */
        }
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label={`Copy ${label}`}
    >
      <Copy className="h-3 w-3" aria-hidden />
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function ActivityRow({ event, me }: { event: MarketActivityEvent; me: string }) {
  return (
    <li className="min-w-0 rounded-xl border border-border/60 bg-surface p-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${KIND_STYLE[event.kind]}`}
        >
          <KindIcon kind={event.kind} />
          {event.label}
        </span>
        <StatusPill status={event.status} />
        <span className="text-[11px] text-muted-foreground">Block {event.blockNumber}</span>
      </div>

      <p className="mt-2 min-w-0 break-words text-sm font-semibold text-foreground">{summarise(event, me)}</p>

      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2">
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 text-muted-foreground">Token ID</dt>
          <dd className="min-w-0 break-all text-foreground">
            <a href={event.tokenUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              #{event.tokenId}
            </a>
          </dd>
        </div>
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 text-muted-foreground">Price</dt>
          <dd className="min-w-0 break-all text-foreground">
            {event.price && event.symbol ? `${event.price} ${event.symbol}` : "—"}
          </dd>
        </div>
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 text-muted-foreground">Payment token</dt>
          <dd className="min-w-0 break-all text-foreground">
            {event.symbol ? `${event.symbol} · ${short(event.payToken)}` : "—"}
          </dd>
        </div>
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 text-muted-foreground">Counterparty</dt>
          <dd className="min-w-0 break-all text-foreground">{short(event.to ?? event.from)}</dd>
        </div>
        <div className="flex min-w-0 gap-2 sm:col-span-2">
          <dt className="shrink-0 text-muted-foreground">Metadata CID</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-1 text-foreground">
            {event.cid ? (
              <>
                <a
                  href={event.cidUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-all font-mono underline-offset-2 hover:underline"
                  title={event.cid}
                >
                  {shortCid(event.cid)}
                </a>
                <CopyButton value={event.cid} label="metadata CID" />
              </>
            ) : (
              <span className="text-muted-foreground">Not available</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href={event.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary underline-offset-2 hover:underline"
        >
          View on Arcscan <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        <span className="min-w-0 break-all font-mono text-[11px] text-muted-foreground">{shortHash(event.txHash)}</span>
      </div>
    </li>
  );
}

export function MarketActivityPanel({ className = "" }: { className?: string }) {
  const { wallets } = useWallet();
  const fetchActivity = useServerFn(listMarketActivity);

  const [data, setData] = useState<MarketActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [kind, setKind] = useState<"all" | ActivityKind>("all");

  const address = (wallets.find((w) => w.walletClientType === "privy")?.address ?? wallets[0]?.address ?? "") as string;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchActivity({ data: { limit: 40 } });
      setData(res as MarketActivity);
    } catch {
      setData({
        events: [],
        market: "",
        nft: "",
        configured: true,
        source: "none",
        degraded: true,
        detail: "Marketplace activity could not be loaded right now.",
        scannedBlocks: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchActivity]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const all = data?.events ?? [];
    const byScope =
      scope === "mine" && address
        ? all.filter(
            (e) =>
              e.from?.toLowerCase() === address.toLowerCase() ||
              e.to?.toLowerCase() === address.toLowerCase(),
          )
        : all;
    return kind === "all" ? byScope : byScope.filter((e) => e.kind === kind);
  }, [data, scope, kind, address]);

  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black tracking-tight text-foreground">Market activity</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Every list, buy, cancel and transfer of a Move Rights NFT, read straight from Arc Testnet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          Refresh
        </button>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(["mine", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`min-h-[34px] rounded-md px-3 text-[12px] font-bold uppercase tracking-wide transition-colors ${
                scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "mine" ? "Mine" : "All"}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setKind(f.id)}
              className={`min-h-[34px] rounded-full border px-3 text-[12px] font-semibold transition-colors ${
                kind === f.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {scope === "mine" && !address && (
        <p className="mt-4 rounded-lg border border-border/60 bg-surface px-3 py-2 text-[13px] text-muted-foreground">
          Connect your wallet to see only your own receipts, or switch to <span className="font-semibold">All</span>.
        </p>
      )}

      {data?.detail && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300">
          {data.detail}
        </p>
      )}

      {loading && !data ? (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading Arc Testnet logs…
        </p>
      ) : filtered.length === 0 ? (
        !data?.detail && (
          <p className="mt-4 rounded-lg border border-border/60 bg-surface px-3 py-2 text-[13px] text-muted-foreground">
            {scope === "mine" && address
              ? "No marketplace activity for this wallet yet. List, buy or transfer a move and it will show up here."
              : "No marketplace activity in the recent block window yet."}
          </p>
        )
      ) : (
        <ul className="mt-4 grid min-w-0 gap-2.5">
          {filtered.map((e) => (
            <ActivityRow key={e.id} event={e} me={address} />
          ))}
        </ul>
      )}

      {data && !data.degraded && data.scannedBlocks > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Scanned the last {data.scannedBlocks.toLocaleString()} Arc blocks · market {short(data.market)} · collection{" "}
          {short(data.nft)}
        </p>
      )}
    </section>
  );
}
