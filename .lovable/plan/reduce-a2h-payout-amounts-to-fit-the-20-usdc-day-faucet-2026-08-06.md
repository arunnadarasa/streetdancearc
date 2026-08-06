# Reduce A2H payout amounts to fit the 20 USDC/day faucet

## Goal
Make the A2H demo runnable several times per day within the 20 USDC daily faucet limit, while keeping the human-in-the-loop approval example meaningful.

## Changes

1. **Lower the automatic rights-sweep payout**
   - In `src/lib/a2h.server.ts`, change `PAYOUT_UNIT_USD` from `0.002` to `0.001`.
   - In `src/components/a2h/A2hHome.tsx`, change `SWEEP_PLAYS` from `1204` to `1000`.
   - Result: each "Run rights sweep" sends **~1.00 USDC** (was ~2.41 USDC), allowing roughly 20 sweeps per day from a 20 USDC faucet.

2. **Reduce the demo above-cap approval request**
   - In `src/components/a2h/A2hHome.tsx`, change the `approvalMessage` call from `12.8` to `7.5` USD.
   - It stays **above the 5.00 USD per-payout cap**, so the approve/decline card still demonstrates human-in-the-loop control, but consumes less if approved.

3. **Update related copy**
   - Update the sweep description text that mentions the play count (`1,204` → `1,000`).
   - No other user-facing numbers need changing; caps and mandate values remain the same.

## Verification
- Run the app build to confirm no type or lint errors.
- Optionally trigger a sweep in the preview to confirm the sent amount is ~1.00 USDC.

## Out of scope
- No changes to per-payout/daily caps, token contracts, treasury wallet, or slide deck.
