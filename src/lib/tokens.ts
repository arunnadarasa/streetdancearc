// src/lib/tokens.ts - the three stablecoins every Creative Blockchain app must support
export const ARC_CHAIN_ID = 5042002;
// Browser calls go through a same-origin proxy so the provider key stays server-side.
export const ARC_RPC_URL  = "/api/public/arc-rpc";
export const ARC_EXPLORER = "https://testnet.arcscan.app";

/**
 * `native: true` means the token IS Arc's gas token, so paying it is a plain
 * value transfer. Everything else is an ERC-20 and settles via transfer().
 *
 * `perUsd` is a FIXED DEMO ORACLE, not a price feed. It converts a listed
 * fiat price into token units so the same catalogue can be paid in any of the
 * three. Swap for a real oracle before anything touches mainnet.
 */
export const TOKENS = {
  USDC:   { symbol: "USDC",   address: "0x3600000000000000000000000000000000000000", decimals: 6, native: true,  perUsd: 1,          label: "US Dollar (native gas)" },
  EURC:   { symbol: "EURC",   address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6, native: false, perUsd: 0.92,       label: "Euro Coin" },
  cirBTC: { symbol: "cirBTC", address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8, native: false, perUsd: 0.00000091, label: "Circle Wrapped BTC" },
} as const;
export type TokenKey = keyof typeof TOKENS;

export const TOKEN_KEYS = Object.keys(TOKENS) as TokenKey[];

export function isTokenKey(v: unknown): v is TokenKey {
  return typeof v === "string" && v in TOKENS;
}

/** Convert a decimal token amount to atomic units, honouring per-token decimals. */
export function toAtomic(amount: number | string, token: TokenKey): bigint {
  const { decimals } = TOKENS[token];
  const s = typeof amount === "number" ? amount.toFixed(decimals) : amount.trim();
  const neg = s.startsWith("-");
  const [whole = "0", frac = ""] = (neg ? s.slice(1) : s).split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const v = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
  return neg ? -v : v;
}

/** Atomic units back to a decimal string with the token's full precision. */
export function fromAtomic(atomic: bigint | string, token: TokenKey): string {
  const { decimals } = TOKENS[token];
  const v = typeof atomic === "bigint" ? atomic : BigInt(atomic);
  const s = v.toString().padStart(decimals + 1, "0");
  return `${s.slice(0, -decimals)}.${s.slice(-decimals)}`;
}

/** Display string, e.g. "2.400000 EURC" — trimmed to a sane number of places. */
export function formatAmount(atomic: bigint | string, token: TokenKey): string {
  const places = TOKENS[token].decimals === 8 ? 8 : 6;
  const n = Number(fromAtomic(atomic, token));
  return `${n.toFixed(places)} ${TOKENS[token].symbol}`;
}

/** Listed fiat price -> token amount, via the demo oracle above. */
export function convertFromUsd(usd: number, token: TokenKey): number {
  return usd * TOKENS[token].perUsd;
}

/** CAIP-19 asset id used in x402 / AP2 / UCP payloads. */
export function caip19(token: TokenKey): string {
  const t = TOKENS[token];
  return t.native
    ? `eip155:${ARC_CHAIN_ID}/slip44:60`
    : `eip155:${ARC_CHAIN_ID}/erc20:${t.address}`;
}
