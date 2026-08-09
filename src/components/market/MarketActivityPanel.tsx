import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeftRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
} from "lucide-react";
import { listMidnightMoveActivity } from "@/lib/move-nft.functions";
import { useWallet } from "@/lib/wallet-context";

type ActivityItem = Awaited<ReturnType<typeof listMidnightMoveActivity>>["items"][number];
type Kind = ActivityItem["kind"];

const KIND_STYLE: Record<Kind, string> = {
  list: "bg-primary/15 text-primary",
  buy: "bg-glow/15 text-glow",
  cancel: "bg-secondary text-muted-foreground",
  transfer: "bg-amber-500/15 text-amber-400",
  mint: "bg-emerald-500/15 text-emerald-400",
};

const FILTERS: Array<{ id: "all" | Kind; label: string }> = [
  { id: "all", label: "All" },
  { id: "list", label: "Listed" },
  { id: "buy", label: "Sold" },
  { id: "cancel", label: "Cancelled" },
  { id: "transfer", label: "Transfers" },
  { id: "mint", label: "Mints" },
];

function short(a: string | undefined) {
  if (!a) return "—";
  return a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a;
}

function shortHash(h: string) {
  return h ? `${h.slice(0, 10)}…${h.slice(-8)}` : "—";
}

function KindIcon({ kind }: { kind: Kind }) {
  if (kind === "list" || kind === "cancel") return <Tag className="h-3.5 w-3.5" aria-hidden />;
  if (kind === "buy" || kind === "mint") return <Sparkles className="h-3.5 w-3.5" aria-hidden />;
  return <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />;
}

function summarise(e: ActivityItem, me: string): string {
  const mine = (a: string | undefined) => Boolean(a && me && a === me);
  const move = `move #${e.tokenId}`;
  const amount = e.priceAtomic
    ? `${(Number(e.priceAtomic) / 1e6).toFixed(6).replace(/0+$/, "").replace(/\.$/, "")} mUSDC`
    : null;

  switch (e.kind) {
    case "list":
      return mine(e.actor)
        ? `You listed ${move}${amount ? ` for ${amount}` : ""}`
        : `${short(e.actor)} listed ${move}${amount ? ` for ${amount}` : ""}`;
    case "cancel":
      return mine(e.actor) ? `You cancelled ${move}` : `${short(e.actor)} cancelled ${move}`;
    case "buy":
      return mine(e.actor)
        ? `You bought ${move}${amount ? ` for ${amount}` : ""}`
        : `${short(e.actor)} bought ${move}${amount ? ` for ${amount}` : ""}`;
    case "mint":
      return mine(e.actor) ? `You minted ${move}` : `${short(e.actor)} minted ${move}`;
    default:
      return mine(e.actor)
        ? `You transferred ${move} to ${short(e.counterparty)}`
        : `${short(e.actor)} transferred ${move} to ${short(e.counterparty)}`;
  }
}

export function MarketActivityPanel() {
  const { wallets, unshieldedAddress } = useWallet();
  const fetchActivity = useServerFn(listMidnightMoveActivity);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [scope, setScope] = useState<"mine" | "all">("all");

  const me =
    unshieldedAddress ||
    wallets.find((w) => w.walletClientType === "privy")?.address ||
    wallets[0]?.address ||
    "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchActivity({ data: undefined });
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchActivity]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    return items.filter((e) => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (scope === "mine" && me) {
        return e.actor === me || e.counterparty === me;
      }
      return true;
    });
  }, [items, filter, scope, me]);

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Market activity
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mint, list, buy, cancel and transfer of Compact MoveNfts on Midnight Undeployed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope("mine")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            scope === "mine" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          Mine
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            scope === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          All
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
        {loading && items.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading MoveNft activity…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No marketplace activity yet. Mint on /moves, then list or transfer here.
          </p>
        ) : (
          rows.map((e) => (
            <div
              key={`${e.kind}-${e.tokenId}-${e.txId}-${e.at}`}
              className="rounded-xl border border-border bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLE[e.kind]}`}
                >
                  <KindIcon kind={e.kind} />
                  {e.kind}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{summarise(e, me)}</p>
              <a
                href={e.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-glow hover:underline"
              >
                {shortHash(e.txId)} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
