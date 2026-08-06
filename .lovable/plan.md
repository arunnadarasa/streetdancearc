# Show wallet balances for USDC, EURC and cirBTC

Today the app already reads all three balances off Arc, but only inside the currency pill's hover tooltip — on mobile that is invisible, so the only hint is the tiny `·0` marker. This makes the balances a first-class, visible part of the header.

## What you get

- Tapping the wallet address chip in the header opens a small **Balances** panel listing all three tokens:
  - token symbol and full name (US Dollar / Euro Coin / Circle Wrapped BTC)
  - live on-chain balance on Arc Testnet, formatted per token (6 decimals for USDC/EURC, 8 for cirBTC)
  - the approximate USD value next to each, using the existing live FX feed
  - the currently selected settlement token marked as active; tapping a row switches settlement to that token
- A **Refresh** control and a "reading Arc…" state, plus a clear "—" when the RPC is rate-limiting rather than a raw error.
- The active token's balance also shows inline next to the currency pill (e.g. `USDC 12.40`) so it is visible without opening anything, on both mobile and desktop.
- When signed out, the panel invites sign-in instead of showing zeros; when a balance is zero it links to the Arc faucet note already used elsewhere.

## Technical notes

- Extract the existing balance-reading logic from `src/components/gx/PayTokenToggle.tsx` into a shared hook `src/lib/use-arc-balances.ts`:
  - same `/api/public/arc-rpc` same-origin proxy, `eth_getBalance` for native USDC and `balanceOf` `eth_call` for EURC/cirBTC
  - one fetch per address for all three tokens, cached in module state for ~30s so header and panel do not double-poll
  - failures resolve to `null` (renders `—`), never throw
- New `src/components/wallet/BalancePanel.tsx`: the dropdown content, driven by the hook plus `usePayToken()` for the active token and `fetchFxRates` (already wired) for USD equivalents.
- `src/components/dance/Header.tsx`: when authenticated, the address button toggles the panel (click-outside and Escape to close) instead of only signing out; sign-out moves into the panel footer.
- `PayTokenToggle` keeps its current behaviour but consumes the shared hook and renders the active balance inline.
- No contract, server, or payment-flow changes — display only.
