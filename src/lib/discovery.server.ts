// Circle Agent Marketplace — x402 resource discovery (keyless public API).
//
// The Agent Stack CLI uses this endpoint internally to find payable services.
// StreetRail calls it directly so the buyer agent discovers x402 endpoints
// instead of hardcoding one. Falls back to StreetRail's own resource so the
// demo works offline.

const DISCOVERY_URL = "https://api.circle.com/v2/x402/discovery/resources";
const TTL_MS = 5 * 60 * 1000;

export const ARC_CAIP2 = "eip155:5042002";

export interface DiscoveredAccept {
  scheme?: string;
  network?: string;
  asset?: string;
  assetName?: string;
  payTo?: string;
  amount?: string;
  amountDisplay?: string;
  maxTimeoutSeconds?: number;
}

export interface DiscoveredResource {
  resource: string;
  type?: string;
  /** First accept entry, kept flat for existing callers. */
  network?: string;
  asset?: string;
  amount?: string;
  description?: string;
  name?: string;
  category?: string;
  tags?: string[];
  website?: string;
  lastUpdated?: string;
  accepts: DiscoveredAccept[];
  networks: string[];
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

/** StreetRail's own checkout, in the marketplace resource shape. */
export function localResource(origin = ""): DiscoveredResource {
  const accepts: DiscoveredAccept[] = [
    {
      scheme: "exact",
      network: ARC_CAIP2,
      asset: "0x3600000000000000000000000000000000000000",
      assetName: "USDC",
      amount: "10000",
      amountDisplay: "0.01 USDC",
      maxTimeoutSeconds: 300,
    },
    {
      scheme: "exact",
      network: ARC_CAIP2,
      asset: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      assetName: "EURC",
      amount: "9200",
      amountDisplay: "0.0092 EURC",
      maxTimeoutSeconds: 300,
    },
    {
      scheme: "exact",
      network: ARC_CAIP2,
      asset: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
      assetName: "cirBTC",
      amount: "10",
      amountDisplay: "0.0000001 cirBTC",
      maxTimeoutSeconds: 300,
    },
  ];
  return {
    resource: `${origin}/api/public/purchase`,
    name: "StreetRail merch checkout",
    type: "http",
    network: ARC_CAIP2,
    asset: "USDC",
    amount: "10000",
    category: "COMMERCE",
    tags: ["x402", "merch", "streetdance", "arc", "usdc", "eurc", "cirbtc"],
    website: origin || "https://streetrail.lovable.app",
    description: "x402 checkout for street-dance merch, settled on Arc Testnet in USDC, EURC or cirBTC.",
    accepts,
    networks: [ARC_CAIP2],
  };
}

function localFallback(reason?: string): DiscoveryResult {
  return {
    source: "local",
    fetchedAt: new Date().toISOString(),
    total: 1,
    arcCount: 1,
    reason,
    resources: [localResource()],
  };
}

function displayAmount(amount?: string, assetName?: string): string | undefined {
  if (!amount) return undefined;
  const n = Number(amount);
  if (!Number.isFinite(n)) return undefined;
  // Marketplace assets are stablecoins; 6 decimals is the near-universal case.
  const value = n / 1e6;
  return `${value < 0.01 ? value.toPrecision(2) : value.toFixed(2)} ${assetName ?? "USDC"}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(items: any[]): DiscoveredResource[] {
  return items.slice(0, 60).map((r) => {
    const raw = Array.isArray(r?.accepts) ? r.accepts : [];
    const accepts: DiscoveredAccept[] = raw.map((a: any) => {
      const assetName = a?.extra?.name ?? a?.assetName;
      const amount = a?.amount ?? a?.maxAmountRequired;
      return {
        scheme: a?.scheme,
        network: a?.network,
        asset: a?.asset,
        assetName,
        payTo: a?.payTo,
        amount: amount != null ? String(amount) : undefined,
        amountDisplay: displayAmount(amount != null ? String(amount) : undefined, assetName),
        maxTimeoutSeconds: typeof a?.maxTimeoutSeconds === "number" ? a.maxTimeoutSeconds : undefined,
      };
    });
    const provider = r?.metadata?.provider ?? {};
    const first = accepts[0];
    return {
      resource: String(r?.resource ?? r?.url ?? "unknown"),
      type: r?.type ?? first?.scheme,
      network: first?.network ?? r?.network,
      asset: first?.assetName ?? first?.asset ?? r?.asset,
      amount: first?.amount,
      name: provider?.name ?? r?.metadata?.name ?? r?.name,
      description: r?.metadata?.description ?? provider?.description ?? r?.description,
      category: provider?.category,
      tags: Array.isArray(provider?.tags) ? provider.tags.slice(0, 8) : undefined,
      website: provider?.website,
      lastUpdated: r?.lastUpdated,
      accepts,
      networks: Array.from(new Set(accepts.map((a) => a.network).filter(Boolean))) as string[],
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
    const resources = [localResource(), ...normalise(items)];
    const value: DiscoveryResult = {
      source: "circle",
      fetchedAt: new Date().toISOString(),
      total: items.length,
      arcCount: resources.filter((r) => r.networks.some((n) => n.includes("5042002"))).length,
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

/** The resource the buyer agent should settle against: ours, matched by network + scheme. */
export function selectArcResource(result: DiscoveryResult): DiscoveredResource {
  return (
    result.resources.find(
      (r) =>
        r.resource.includes("/api/public/purchase") &&
        r.accepts.some((a) => a.network === ARC_CAIP2 && a.scheme === "exact"),
    ) ??
    result.resources.find((r) => r.networks.includes(ARC_CAIP2)) ??
    localResource()
  );
}
