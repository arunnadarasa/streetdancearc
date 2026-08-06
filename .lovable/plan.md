# Nanopayment upgrade for A2H payouts

Apply the patterns learned from the CliniPay and Krump reference demos so StreetRail's rights payouts behave like true nanopayments: accrue tiny per-play amounts off-chain, then settle them on Arc in one batched transaction. This stretches the 20 USDC/day faucet a long way and makes the A2H demo repeatable.

## What changes for the user

- The A2H payout inbox shows a live **accrual meter** per move: plays counted, amount owed in minor units (e.g. `1 240 plays · 124¢ owed`), and how close it is to the settlement threshold.
- "Run rights sweep" now **accrues** instead of paying immediately. Once a move crosses the batch threshold (default $0.50) or the user hits **Settle now**, one on-chain transfer + one registry log covers the whole batch.
- Each settled batch expands into the individual nanopayments it covers, so judges can see "one tx, 500 micro-payouts".
- Amounts everywhere in A2H switch to minor units with a readable fiat/token line, keeping sub-cent values honest instead of rounding to `0.00`.
- Caps still apply: per-batch cap and daily cap are checked at settlement time, and anything above the per-payout cap still needs the human approval card.

## Technical notes

- New `src/lib/nanoledger.server.ts`: in-memory accrual ledger keyed by `address:moveCid:token`, storing minor-unit amounts, play counts, and a `batchId`. Pure module, no DB — matches the no-Cloud constraint. Session-scoped like the existing `sessionPayouts` cache.
- `src/lib/a2h-engine.server.ts`: split `settle()` into `accrue()` (ledger only, returns updated batch state) and `settleBatch()` (existing cap check → `sendPayout` → signed AP2 mandate). The mandate gains a `nanopayments[]` array listing each accrued item with its play count, so the receipt proves what the single tx covered.
- `src/lib/a2h.functions.ts`: add `accruePayout`, `settleBatch`, and `listAccruals` server fns; keep the existing list/push/approve fns working (push becomes accrue + auto-settle when over threshold).
- Minor-unit helpers go in `src/lib/fx.ts` (`toMinor`, `formatMinor`) so H2H/H2A/A2A can reuse them later; per-token decimals already exist in `TOKENS`.
- `src/components/a2h/A2hHome.tsx`: accrual meter card, Settle now button, batch expansion in the receipt list. No change to the degraded-registry banner.
- Threshold and unit constants live beside `PAYOUT_UNIT_USD` in `a2h.server.ts`: `BATCH_THRESHOLD_USD = 0.5`.
- Out of scope for now: EIP-3009 `transferWithAuthorization` signing and per-user Circle wallet auto-provisioning. Both are follow-ups once batching is proven.
