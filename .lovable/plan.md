# StreetRail live FX feed plan

## Goal
Replace the fixed demo `perUsd` oracle in `src/lib/tokens.ts` with live fiat + crypto FX rates, while keeping safe fallbacks so the hackathon demo never breaks.

## Providers
- **Frankfurter** (`https://api.frankfurter.dev/v1/latest`) for fiat: GBP, EUR → USD.
- **CoinGecko** (`https://api.coingecko.com/api/v3/simple/price`) for crypto: BTC → USD (drives cirBTC).
- Both offer free, no-key tiers. Optional `COINGECKO_API_KEY` secret for higher rate limits.

## Server-side feed
1. Create `src/lib/fx.functions.ts` with a `getFxRates` server function.
2. Fetch Frankfurter + CoinGecko in parallel.
3. Cache results for 5 minutes in process memory (safe for demo; no DB required).
4. Return a DTO: `{ usdPerGbp, usdPerEur, usdPerBtc, source, cachedAt }`.
5. On any provider failure, return the last cached value or hardcoded fallback and log the error.

## Token oracle refactor
1. In `src/lib/tokens.ts`, change `perUsd` from fixed numbers to a function `getTokenUsdRate(token, fxRates)`.
2. Keep fallback table for offline/demo use.
3. Add helpers: `convertFromFiat(fiatAmount, fiatCurrency, token, fxRates)`.
4. Update `convertFromUsd` to use the live rate when available.

## x402 purchase endpoint
1. Update `src/routes/api/public/purchase.ts` to call `getFxRates()` when building the 402 challenge.
2. Quote all three tokens using live rates.
3. Add `fx` block to challenge `extra` (source, timestamp, rates used).
4. Verification logic stays the same — it still checks on-chain transfer amounts.

## Frontend updates
1. `PayTokenToggle.tsx`: display the current USD-equivalent rate for the selected token and a "last updated" timestamp.
2. `CartDrawer.tsx`: show the live token amount and fiat-equivalent before "Pay on Arc".
3. `AgentNegotiation.tsx` / `useAgentRun.ts`: use live rates for quote totals and AP2 cap checks.
4. `A2hHome.tsx` / `a2h-feed.ts`: redenominate seeded payouts with live rates.

## Fallback & resilience
- If FX API fails, fall back to the existing demo table.
- If rates are stale (>15 minutes), show a subtle "offline rates" indicator in the UI.
- No new secrets required for the free tier; optionally support `COINGECKO_API_KEY`.

## Verification
- Build passes.
- All four modes (H2H, H2A, A2A, A2H) still settle in the selected token.
- Playwright checks that the header toggle shows a live rate and the cart total matches.
