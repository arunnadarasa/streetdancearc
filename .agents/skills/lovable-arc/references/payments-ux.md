# Multi-stablecoin payment UX on Arc

## One TOKENS table, three decimal widths

```ts
export const TOKENS = {
  USDC:   { address: "0x3600000000000000000000000000000000000000", decimals: 6, native: true },
  EURC:   { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6 },
  cirBTC: { address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8 },
} as const;
```

cirBTC is **8 decimals**. Every `toAtomic`/`fromAtomic` must read from this
table — a hardcoded `1e6` shows a cirBTC balance off by 100×.

USDC is both the native gas token and an ERC-20 at the same address. For a
Circle transfer, **omit** `tokenAddress` to move native USDC; include it for
EURC/cirBTC.

## Global currency toggle

A single context (`PayTokenContext`) driving every payment surface beats a
per-panel selector: users pick once, and every quote, balance and receipt
re-denominates. Persist the choice.

Show the **normal** amount, not micro-units: `0.001 USDC`, never
`1000 µUSDC`. Display USD equivalents next to non-USD tokens.

## FX

Live rates via Frankfurter (EUR) + CoinGecko (BTC), cached server-side for
~5 minutes. CoinGecko demo keys go to the demo host with the
`x-cg-demo-api-key` header — sending a demo key to the pro host 401s. Always
keep a static fallback rate so the UI degrades instead of blanking.

## Privy approval-modal gotchas (users will report these as bugs)

- The modal always shows the **gas-token** balance (USDC on Arc), whatever
  ERC-20 the tx targets.
- The "Approval amount" row renders **blank** for tokens Privy has no metadata
  for — i.e. EURC and cirBTC on Arc.

Compensate in your own UI:

1. Render a pre-confirmation summary above the confirm button: "You'll approve
   `{amount} {symbol}` to be spent by `{contractName}`. Token: `0xABCD…1234`" —
   matching the short address Privy shows, so users can cross-check.
2. If a token address is unset (zero address), **gate it in the switcher**
   (disabled + hint). Never let the form silently skip the `approve` step.

## Transfer / buy preflight

Before sending, check on-chain and fail with copy the user can act on:
ownership (`ownerOf`), approval (`getApproved`/`isApprovedForAll`), ERC-20
allowance and balance for the selected token, and recipient validity. A
`mapChainError` helper turns `user rejected`, `insufficient funds`,
`ERC721IncorrectOwner`, `royalty_failed`, `pay_failed` into one-line copy plus
a collapsible raw detail.

## Treasury visibility

Agent-driven payouts fail opaquely when the Circle treasury runs out of gas.
Surface treasury address, USDC/EURC/cirBTC balances, and an explicit `lowGas`
warning with a faucet link. Same for the user's embedded wallet.

## Faucet economics

The Circle faucet drips ~20 USDC/day for Arc Testnet. Size demo flows around
it: per-payout units of ~$0.001, an off-chain session ledger that accrues and
settles on-chain only when the open batch crosses ~$0.50, and per-payout /
daily caps enforced in code. One demo day then costs cents.
