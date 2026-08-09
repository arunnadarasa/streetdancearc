// Midnight Undeployed settlement tokens.
// mUSDC is an experimental Compact mimic (no peg). USDC/EURC/cirBTC keys remain for
// catalog FX display, but on-chain settle always goes through mUSDC server-append.

export const NETWORK_ID = (import.meta.env.VITE_NETWORK_ID as string) || "undeployed";
export const INDEXER_URL =
  (import.meta.env.VITE_INDEXER_URL as string) || "http://localhost:8088/api/v4/graphql";
export const INDEXER_WS_URL =
  (import.meta.env.VITE_INDEXER_WS_URL as string) || "ws://localhost:8088/api/v4/graphql/ws";
export const PROOF_SERVER_URL =
  (import.meta.env.VITE_PROOF_SERVER_URL as string) || "http://localhost:6300";

/** Indexer GraphQL is the explorer surface on Undeployed (no Arcscan). */
export const MIDNIGHT_EXPLORER = INDEXER_URL;
/** @deprecated use MIDNIGHT_EXPLORER */
export const ARC_EXPLORER = MIDNIGHT_EXPLORER;
/** Legacy Arc chain id — unused on Midnight; kept so old imports don't explode. */
export const ARC_CHAIN_ID = 0;
export const ARC_RPC_URL = "";

export const TOKENS = {
  USDC: {
    symbol: "mUSDC",
    address: "midnight:musdc",
    decimals: 6,
    native: true,
    label: "Midnight USDC (experimental mimic)",
  },
  EURC: {
    symbol: "mUSDC",
    address: "midnight:musdc",
    decimals: 6,
    native: true,
    label: "Priced in EUR → settled as mUSDC",
  },
  cirBTC: {
    symbol: "mUSDC",
    address: "midnight:musdc",
    decimals: 6,
    native: true,
    label: "Priced in BTC → settled as mUSDC",
  },
} as const;
export type TokenKey = keyof typeof TOKENS;

export const TOKEN_KEYS = Object.keys(TOKENS) as TokenKey[];

/**
 * Distinct settle assets for UI toggles. On Undeployed, USDC/EURC/cirBTC all
 * settle as experimental mUSDC — so the switcher collapses to one key.
 */
export const SETTLE_TOKEN_KEYS: TokenKey[] = (() => {
  const seen = new Set<string>();
  const out: TokenKey[] = [];
  for (const k of TOKEN_KEYS) {
    const sym = TOKENS[k].symbol;
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push(k);
  }
  return out;
})();

export function isTokenKey(v: unknown): v is TokenKey {
  return typeof v === "string" && v in TOKENS;
}

export function toAtomic(amount: number | string, token: TokenKey): bigint {
  const { decimals } = TOKENS[token];
  const s = typeof amount === "number" ? amount.toFixed(decimals) : amount.trim();
  const neg = s.startsWith("-");
  const [whole = "0", frac = ""] = (neg ? s.slice(1) : s).split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const v = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
  return neg ? -v : v;
}

export function fromAtomic(atomic: bigint | string, token: TokenKey): string {
  const { decimals } = TOKENS[token];
  const v = typeof atomic === "bigint" ? atomic : BigInt(atomic);
  const s = v.toString().padStart(decimals + 1, "0");
  return `${s.slice(0, -decimals)}.${s.slice(-decimals)}`;
}

export function formatAmount(atomic: bigint | string, token: TokenKey): string {
  const places = 6;
  const n = Number(fromAtomic(atomic, token));
  return `${n.toFixed(places)} mUSDC`;
}

export type { FxRates } from "./fx";
export { getTokenUsdRate, fiatToUsd, convertFromFiat, convertFromUsd, FALLBACK_RATES } from "./fx";

/** CAIP-19-style asset id for Midnight mUSDC overlays. */
export function caip19(_token: TokenKey): string {
  return `midnight:${NETWORK_ID}/musdc`;
}

export function txExplorerUrl(txHash: string): string {
  return `${INDEXER_URL}#tx=${encodeURIComponent(txHash)}`;
}
