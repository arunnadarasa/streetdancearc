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

// ---------------------------------------------------------------------------
// Minor-unit helpers.
//
// Nanopayments are far below one cent, so accrual is tracked in micro-USD
// (1e-6 USD) integers and only rendered as cents/dollars at the edge. Rounding
// to 2dp too early turns every per-play royalty into "0.00".
// ---------------------------------------------------------------------------

/** USD -> integer micro-USD (1e-6 USD). */
export function usdToMicro(usd: number): number {
  return Math.round(usd * 1_000_000);
}

/** Integer micro-USD -> USD. */
export function microToUsd(micro: number): number {
  return micro / 1_000_000;
}

/** USD -> integer minor units (cents). */
export function toMinor(usd: number): number {
  return Math.round(usd * 100);
}

/**
 * Render micro-USD honestly: sub-dollar amounts stay in cents (with decimals
 * when they are sub-cent), everything else reads as dollars.
 */
export function formatMinor(micro: number): string {
  const cents = micro / 10_000;
  if (Math.abs(cents) < 1) return `${cents.toFixed(2)}¢`;
  if (Math.abs(cents) < 100) return `${cents.toFixed(cents < 10 ? 2 : 1)}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}
