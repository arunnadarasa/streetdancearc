# Show the treasury balance and address

The payout failure in the screenshot ("The treasury wallet is out of USDC gas") is only discoverable after a payout is attempted. The treasury address and its balances are never shown anywhere in the UI, so there is no way to see the problem coming or to know which address to top up at the faucet.

## What to add

A **Treasury card** in the A2H view, placed directly under the hero and above the standing-authorization card, because A2H is the mode where the Circle treasury — not the user's wallet — pays.

The card shows:
- Label "Circle treasury · Arc Testnet" with the truncated address, a copy button, and a link to the address on Arcscan.
- The three balances (USDC / EURC / cirBTC) with USD equivalents, same formatting as the user wallet panel.
- A refresh control.
- An amber warning strip when USDC is below a small gas floor: "Treasury is low on USDC gas — payouts will fail. Top up at faucet.circle.com" with the faucet as a link.

Also surface the same low-USDC warning inline on the A2H inbox so a user about to hit "Approve payout" sees it before the attempt rather than after.

## Notes

- Treasury address comes from the existing public config server function; nothing new is exposed — the address is already a public on-chain identity, and no keys or wallet IDs are involved.
- Balances reuse the existing Arc balances hook and its RPC proxy and cache, so this adds no new fetching path.
- If the treasury address is not configured in the environment, the card renders a single muted line saying the treasury is not configured, instead of showing a zero address.

## Technical details

- New `src/components/a2h/TreasuryPanel.tsx`; reuses `useArcBalances`, `shortBalance`, `getTokenUsdRate`, `TOKENS`/`TOKEN_KEYS`, and `ARC_EXPLORER`.
- Address read via `getPublicConfig` (`treasuryAddress`) through `useServerFn`, same as the cart already does.
- Mounted in `src/components/a2h/A2hHome.tsx`; the low-gas flag is lifted from the panel so the inbox section can show the matching hint.
- Verify at 390px and desktop with Playwright after the change.
