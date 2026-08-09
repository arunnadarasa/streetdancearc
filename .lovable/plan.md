# Fix "Wallet unavailable" on some pages

## What's happening

The header's wallet button reads `available` from the wallet context. That context is only populated by `PrivyRoot`, which today is wrapped individually around the page body of seven routes: home, shop, product, moves, market, markets, agent-negotiation.

Three routes render `Header` without wrapping it in `PrivyRoot`:

- `/judge`
- `/primer`
- `/deck`

On those pages the context falls back to its default `WALLET_UNAVAILABLE` value, so the header shows the grey "Wallet unavailable" chip (and the mobile drawer shows the matching notice) even though the Privy app ID is perfectly fine. It's a missing-provider issue, not a config issue.

Side effect of the current setup: the Privy provider remounts on every navigation between wrapped routes, so a signed-in session has to re-initialise each time.

## The fix

Mount the wallet provider once, at the app root, instead of per page.

1. Add a root-level loader in `src/routes/__root.tsx` that calls the existing `getPublicConfig` server function (`privyAppId`, `treasuryAddress`).
2. Wrap `<Outlet />` in `PrivyRoot` there, passing the loaded app ID.
3. Remove the per-route `PrivyRoot` wrappers from the seven routes that have them, keeping their loaders where `treasuryAddress` is still consumed by the page.
4. Leave `Header`, `MobileDrawer`, and the `WALLET_UNAVAILABLE` fallback untouched — the chip stays as a genuine signal for builds with no app ID at all.

Result: sign-in, address chip, and balances work on every page including `/judge`, `/primer` and `/deck`, and the Privy session persists across client-side navigation.

## Verification

- Load `/judge`, `/primer`, `/deck` and confirm the header shows "Sign in with Google" (or the connected address) instead of "Wallet unavailable".
- Confirm the previously-wrapped pages still render and still receive `treasuryAddress`.
- Typecheck and build.
