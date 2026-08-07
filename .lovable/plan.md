# Wire CoinGecko demo key into FX feed

## Goal
Use the user's CoinGecko **demo** API key for the live BTC/USD rate feed, while keeping the existing Pro-key path intact.

## Current state
- `src/lib/fx.server.ts` already reads `process.env["COINGECKO_API_KEY"]`.
- When a key is present it currently routes to `pro-api.coingecko.com` and sends the `x-cg-pro-api-key` header.
- Demo keys must hit the public endpoint (`api.coingecko.com`) with the `x-cg-demo-api-key` header.

## Plan
1. **Add secret**
   - Request `COINGECKO_API_KEY` via the secure secret form.
   - Treat the value as opaque (demo keys typically start with `CG-`).

2. **Update `src/lib/fx.server.ts`**
   - Detect key type by hostname/prefix heuristic or a separate `COINGECKO_API_KEY_TYPE` variable.
   - For demo keys: use `https://api.coingecko.com/api/v3/simple/price` and header `x-cg-demo-api-key`.
   - For pro keys: keep `https://pro-api.coingecko.com/api/v3/simple/price` and header `x-cg-pro-api-key`.
   - When no key is set, keep the existing public (unauthenticated) fallback.

3. **Verify**
   - Call the FX server function from a dev route and confirm `usdPerBtc` returns a current value with `source: "frankfurter+coingecko"`.
   - Confirm stale/fallback behavior still works if the API is rate-limited.

## Out of scope
- No UI changes.
- No changes to Frankfurter fiat fetch.
- No changes to token list or balance display.
