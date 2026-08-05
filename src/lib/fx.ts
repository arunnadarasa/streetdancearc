// src/lib/fx.ts - FX types and pure conversion helpers.
// Live rates come from src/lib/fx.server.ts; this module is safe to import
// in client components because it never fetches.

import type { TokenKey } from "./tokens";

export interface FxRates {
  /** USD per 1 GBP (e.g. 1.27). */
  usdPerGbp: number;
  /** USD per 1 EUR (e.g. 1.09). */
  usdPerEur: number;
  /** USD per 1 BTC (e.g. 109_000). */
  usdPerBtc: number;
  source: string;
  cachedAt: number;
  /** True when the live feed failed and a cached/fallback rate is being used. */
  stale: boolean;
}

export const FALLBACK_RATES: FxRates = {
  usdPerGbp: 1.27,
  usdPerEur: 1.09,
  usdPerBtc: 109_000,
  source: "fallback",
  cachedAt: 0,
  stale: false,
};

/** How many token units 1 USD buys (e.g. EURC perUsd ≈ 0.92 when EUR/USD = 1.09). */
export function getTokenUsdRate(token: TokenKey, fx?: FxRates | null): number {
  const rates = fx ?? FALLBACK_RATES;
  switch (token) {
    case "USDC":
      return 1;
    case "EURC":
      return 1 / rates.usdPerEur;
    case "cirBTC":
      return 1 / rates.usdPerBtc;
    default:
      return 1;
  }
}

/** Convert a fiat amount to USD using the live FX feed. */
export function fiatToUsd(fiatAmount: number, currency: string, fx?: FxRates | null): number {
  const c = currency.toUpperCase();
  if (c === "USD" || c === "USDC") return fiatAmount;
  const rates = fx ?? FALLBACK_RATES;
  if (c === "GBP") return fiatAmount * rates.usdPerGbp;
  if (c === "EUR" || c === "EURC") return fiatAmount * rates.usdPerEur;
  return fiatAmount;
}

/** Convert a fiat amount directly into token units. */
export function convertFromFiat(
  fiatAmount: number,
  currency: string,
  token: TokenKey,
  fx?: FxRates | null,
): number {
  return fiatToUsd(fiatAmount, currency, fx) * getTokenUsdRate(token, fx);
}

/** Convert a USD amount into token units. */
export function convertFromUsd(usd: number, token: TokenKey, fx?: FxRates | null): number {
  return usd * getTokenUsdRate(token, fx);
}
