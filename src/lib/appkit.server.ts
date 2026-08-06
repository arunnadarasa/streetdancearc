// Worker-safe Circle rail status adapters.
//
// Circle's App Kit packages currently pull Solana's Anchor SDK into the server
// bundle. Anchor executes CommonJS-only `exports.*` code during Worker startup,
// taking down every SSR route. StreetRail settles on Arc, so these optional
// cross-chain SDK features report a graceful fallback instead of importing the
// incompatible packages.

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

export async function unifiedBalance(address?: string): Promise<UnifiedBalanceResult> {
  const addr = address ?? process.env["CIRCLE_TREASURY_ADDRESS"] ?? null;
  return {
    available: false,
    address: addr,
    totalUsdc: null,
    chains: [],
    reason: addr ? "cross_chain_sdk_unavailable_on_worker" : "no_treasury_address",
  };
}

export async function swapRates(fxUsdRates: { token: string; usd: number }[]): Promise<SwapRatesResult> {
  return {
    available: false,
    source: "fx-fallback",
    rates: fxUsdRates,
    supportedChains: ["arcTestnet"],
    reason: "cross_chain_sdk_unavailable_on_worker",
  };
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
