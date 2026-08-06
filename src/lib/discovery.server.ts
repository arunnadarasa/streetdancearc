// Circle Agent Marketplace — x402 resource discovery (keyless public API).
//
// The Agent Stack CLI uses this endpoint internally to find payable services.
// StreetRail calls it directly so the buyer agent discovers x402 endpoints
// instead of hardcoding one. Falls back to StreetRail's own resource so the
// demo works offline.

const DISCOVERY_URL = "https://api.circle.com/v2/x402/discovery/resources";
const TTL_MS = 5 * 60 * 1000;

export interface DiscoveredResource {
  resource: string;
  type?: string;
  network?: string;
  asset?: string;
  amount?: string;
  description?: string;
  name?: string;
}

export interface DiscoveryResult {
  source: "circle" | "local";
  fetchedAt: string;
  total: number;
  arcCount: number;
  resources: DiscoveredResource[];
  reason?: string;
}

let cache: { at: number; value: DiscoveryResult } | null = null;

function localFallback(reason?: string): DiscoveryResult {
  return {
    source: "local",
    fetchedAt: new Date().toISOString(),
    total: 1,
    arcCount: 1,
    reason,
    resources: [
      {
        resource: "/api/public/purchase",
        name: "StreetRail merch checkout",
        type: "http",
        network: "eip155:5042002",
        asset: "USDC",
        description: "x402 checkout for street-dance merch, settled on Arc Testnet.",
      },
    ],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(items: any[]): DiscoveredResource[] {
  return items.slice(0, 25).map((r) => {
    const accepts = Array.isArray(r?.accepts) ? r.accepts[0] : undefined;
    return {
      resource: String(r?.resource ?? r?.url ?? "unknown"),
      type: r?.type ?? accepts?.scheme,
      network: accepts?.network ?? r?.network,
      asset: accepts?.asset ?? r?.asset,
      amount: accepts?.maxAmountRequired ?? accepts?.amount,
      name: r?.metadata?.name ?? r?.name,
      description: r?.metadata?.description ?? r?.description,
    };
  });
}

export async function discoverResources(): Promise<DiscoveryResult> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const res = await fetch(DISCOVERY_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`discovery_${res.status}`);
    const json = (await res.json()) as { data?: { items?: unknown[] }; items?: unknown[] };
    const items = (json.data?.items ?? json.items ?? []) as unknown[];
    if (!items.length) throw new Error("discovery_empty");
    const resources = normalise(items);
    const value: DiscoveryResult = {
      source: "circle",
      fetchedAt: new Date().toISOString(),
      total: items.length,
      arcCount: resources.filter((r) => (r.network ?? "").includes("5042002")).length,
      resources,
    };
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    const value = localFallback(e instanceof Error ? e.message : String(e));
    cache = { at: Date.now(), value };
    return value;
  }
}
