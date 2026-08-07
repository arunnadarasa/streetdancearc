import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Radar } from "lucide-react";
import { fetchDiscovery } from "@/lib/discovery.functions";

const ARC = "eip155:5042002";

const NETWORK_LABELS: Record<string, string> = {
  "eip155:5042002": "Arc Testnet",
  "eip155:8453": "Base",
  "eip155:137": "Polygon",
  "eip155:1": "Ethereum",
  "eip155:42161": "Arbitrum",
  "eip155:10": "Optimism",
};

function netLabel(n?: string) {
  if (!n) return "unknown";
  return NETWORK_LABELS[n] ?? n;
}

type Filter = "all" | "arc" | "other";

/**
 * The agent's view of Circle's Agent Marketplace: live x402 resources it could
 * pay, discovered rather than hardcoded.
 */
export function DiscoveryPanel() {
  const fetchFn = useServerFn(fetchDiscovery);
  const { data, isLoading } = useQuery({
    queryKey: ["x402-discovery"],
    queryFn: () => fetchFn(),
    staleTime: 5 * 60 * 1000,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const all = data?.resources ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      const onArc = r.networks.includes(ARC);
      if (filter === "arc" && !onArc) return false;
      if (filter === "other" && onArc) return false;
      if (!needle) return true;
      const hay = [r.name, r.description, r.category, r.resource, ...(r.tags ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [data, filter, q]);

  return (
    <section className="rounded-3xl border border-border/70 bg-surface/60 p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-foreground">
          <Radar className="h-4 w-4 text-glow" />
          Agent marketplace discovery
        </h3>
        {data ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              data.source === "circle"
                ? "border-glow/40 bg-glow/10 text-glow"
                : "border-amber-500/40 bg-amber-500/10 text-amber-400"
            }`}
          >
            {data.source === "circle" ? "live · Circle Agent Marketplace" : "local fallback"}
          </span>
        ) : null}
      </header>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        <code className="text-foreground">GET api.circle.com/v2/x402/discovery/resources</code> — keyless,
        public. The buyer agent picks a payment rail from this catalog instead of a hardcoded endpoint.
        {data?.reason ? ` Marketplace unreachable (${data.reason}).` : null}
      </p>

      {isLoading || !data ? (
        <p className="mt-4 text-xs text-muted-foreground">Scanning the marketplace…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "arc", "other"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
                  filter === f
                    ? "border-glow/50 bg-glow/15 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? `All (${data.resources.length})` : f === "arc" ? `Arc Testnet (${data.arcCount})` : "Other chains"}
              </button>
            ))}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search provider, tag, category…"
              className="min-w-[10rem] flex-1 rounded-full border border-border bg-background/40 px-3.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-glow/50"
            />
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl border border-border/70 bg-background/40 px-4 py-6 text-center text-xs text-muted-foreground">
              No resources match this filter. Circle&apos;s catalog is mostly Base and Polygon today —
              StreetRail is currently the Arc Testnet entry.
            </p>
          ) : (
            <ul className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
              {rows.map((r) => {
                const mine = r.resource.includes("/api/public/purchase");
                return (
                  <li
                    key={r.resource}
                    className={`rounded-xl border px-4 py-3 backdrop-blur ${
                      mine ? "border-glow/40 bg-glow/5" : "border-border/70 bg-background/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-foreground">
                          {r.name ?? r.resource}
                          {mine ? <span className="ml-2 text-[10px] text-glow">selected</span> : null}
                        </p>
                        {r.description ? (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {r.description}
                          </p>
                        ) : null}
                      </div>
                      {r.resource.startsWith("http") ? (
                        <a
                          href={r.resource}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-muted-foreground transition hover:text-glow"
                          aria-label="Open resource"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {r.category ? (
                        <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {r.category.replaceAll("_", " ").toLowerCase()}
                        </span>
                      ) : null}
                      {r.accepts.slice(0, 3).map((a, i) => (
                        <span
                          key={`${r.resource}-${i}`}
                          className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-foreground"
                        >
                          {netLabel(a.network)} · {a.amountDisplay ?? a.assetName ?? "—"}
                        </span>
                      ))}
                      {r.accepts.length > 3 ? (
                        <span className="text-[10px] text-muted-foreground">+{r.accepts.length - 3} more</span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
