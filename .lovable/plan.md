# Round homepage USDC readings to 2 decimals

## What we are changing
The live stats card on the homepage currently shows "USDC settled through the rail" with 4 decimal places (e.g. `41.3800`). We will round that to 2 decimal places (e.g. `41.38`) for cleaner UX.

## Why
4 decimals looks like precision noise on a marketing stat. 2 decimals matches how fiat/stablecoin amounts are normally displayed and aligns with the wallet chip in the header.

## Implementation
1. In `src/lib/metrics.server.ts`, change the USDC settled formatting from `.toFixed(4)` to `.toFixed(2)`.
2. Verify the homepage still loads and the stat renders correctly in the preview.

## Files touched
- `src/lib/metrics.server.ts`
