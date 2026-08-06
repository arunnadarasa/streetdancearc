// Circle App Kits — Unified Balance + Swap rates, server-only.
//
// Unified Balance answers "how much USDC can the agent actually spend right
// now" across chains. Swap Kit backs the USDC / EURC / cirBTC toggle with
// Circle's own token rates instead of only our FX feed.
//
// Both degrade to `available: false` with a reason rather than throwing —
// Arc Testnet coverage varies and the judge demo must not dead-ends.

export interface UnifiedBalanceResult {
  available: boolean;
  address: string | null;
  totalUsdc: string | null;
  chains: { chain: string; amount: string }[];
  reason?: string;
}

export interface SwapRatesResult {
  available: boolean;
  source: "circle-swap-kit" | "fx-fallback";
  rates: { token: string; usd: number }[];
  supportedChains: string[];
  reason?: string;
}

const TREASURY = () => process.env["CIRCLE_TREASURY_ADDRESS"] ?? null;

export async function unifiedBalance(address?: string): Promise<UnifiedBalanceResult> {
  const addr = address ?? TREASURY();
  const base: UnifiedBalanceResult = { available: false, address: addr, totalUsdc: null, chains: [] };
  if (!addr) return { ...base, reason: "no_treasury_address" };
  try {
    const kit = await import("@circle-fin/unified-balance-kit");
    const context = kit.createUnifiedBalanceKitContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await kit.getBalances(context, { address: addr, token: "USDC" } as any)) as unknown as {
      total?: string | number;
      balances?: { chain?: string; amount?: string | number }[];
    };
    const chains = (res.balances ?? []).map((b) => ({
      chain: String(b.chain ?? "unknown"),
      amount: String(b.amount ?? "0"),
    }));
    return {
      available: true,
      address: addr,
      totalUsdc: res.total != null ? String(res.total) : chains.reduce((a, c) => a + Number(c.amount), 0).toString(),
      chains,
    };
  } catch (e) {
    return { ...base, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function swapRates(fxUsdRates: { token: string; usd: number }[]): Promise<SwapRatesResult> {
  try {
    const kit = await import("@circle-fin/swap-kit");
    const context = kit.createSwapKitContext();
    const supportedChains = kit
      .getSupportedChains(context)
      .map((c) => String((c as { name?: string }).name ?? "chain"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = (await kit.getTokenRates(context, { tokens: ["USDC", "EURC"] } as any)) as unknown as {
      rates?: { token?: string; rate?: number | string }[];
    };
    const rates = (res.rates ?? [])
      .map((r) => ({ token: String(r.token ?? ""), usd: Number(r.rate ?? 0) }))
      .filter((r) => r.token && r.usd > 0);
    if (!rates.length) throw new Error("swap_kit_no_rates");
    return { available: true, source: "circle-swap-kit", rates, supportedChains };
  } catch (e) {
    return {
      available: false,
      source: "fx-fallback",
      rates: fxUsdRates,
      supportedChains: ["arcTestnet"],
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Gas Station status.
 *
 * Arc's native gas token is already USDC, so Circle Paymaster (which pays gas
 * in USDC on ETH-gas chains) abstracts nothing here. Gas Station is the
 * product that actually sponsors agent gas on Arc Testnet.
 */
export function gasStationStatus() {
  const policyId = process.env["CIRCLE_GAS_STATION_POLICY_ID"] ?? null;
  return {
    product: "Circle Gas Station",
    enabled: Boolean(policyId),
    policyId: policyId ? `${policyId.slice(0, 8)}…` : null,
    note: policyId
      ? "Agent transactions are gas-sponsored by Circle Gas Station."
      : "Paymaster is intentionally unused: USDC is already Arc's gas token. Gas Station sponsors agent gas when a policy is attached to the wallet set.",
  };
}
