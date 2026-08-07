// src/lib/fx.server.ts - server-only live FX feed.
// Fetches GBP/EUR from Frankfurter and BTC/USD from CoinGecko with a short
// in-memory cache. Import only from server functions / server routes.

import type { FxRates } from "./fx";
import { FALLBACK_RATES } from "./fx";

let cache: { rates: FxRates; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchFrankfurter(): Promise<{ usdPerGbp: number; usdPerEur: number }> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?from=USD&to=GBP,EUR");
  if (!res.ok) throw new Error(`Frankfurter ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { rates: { GBP: number; EUR: number } };
  // rates.GBP is GBP per 1 USD; invert to get USD per 1 GBP.
  return {
    usdPerGbp: 1 / Number(json.rates.GBP),
    usdPerEur: 1 / Number(json.rates.EUR),
  };
}

async function fetchCoinGecko(): Promise<{ usdPerBtc: number }> {
  const key = process.env["COINGECKO_API_KEY"];
  // CoinGecko demo keys start with "CG-" and use the public endpoint with the
  // x-cg-demo-api-key header. Pro keys use pro-api.coingecko.com with
  // x-cg-pro-api-key.
  const isDemo = key ? key.startsWith("CG-") : false;
  const url = key
    ? isDemo
      ? "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
      : "https://pro-api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    : "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
  const headers: Record<string, string> = {};
  if (key) headers[isDemo ? "x-cg-demo-api-key" : "x-cg-pro-api-key"] = key;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { bitcoin: { usd: number } };
  return { usdPerBtc: Number(json.bitcoin.usd) };
}

export async function getFxRates(): Promise<FxRates> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.rates, stale: false };
  }
  try {
    const [fiat, crypto] = await Promise.all([fetchFrankfurter(), fetchCoinGecko()]);
    const rates: FxRates = {
      ...fiat,
      ...crypto,
      source: "frankfurter+coingecko",
      cachedAt: Date.now(),
      stale: false,
    };
    cache = { rates, at: Date.now() };
    return rates;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[fx] live feed failed:", detail);
    if (cache) {
      return { ...cache.rates, stale: true };
    }
    return { ...FALLBACK_RATES, stale: true };
  }
}
