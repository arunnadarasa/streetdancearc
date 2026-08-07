# Make "Claim offer" a real on-chain action

Today "Claim offer" is cosmetic: tapping it only flips local UI state to "Recorded on the thread: claimed". No transaction, no server call, nothing on Arc — unlike "Approve payout" and "Renew mandate", which both settle through the Circle treasury.

## What changes

Claiming an offer becomes an agent-side on-chain receipt:

- Tap "Claim offer" → the button shows "Claiming on Arc…".
- The Drop Agent writes the claim to the rights registry contract from the Circle treasury wallet. No wallet prompt, no user gas.
- The card then shows a claim code, the discounted price, and a clickable "View claim on Arcscan" receipt — the same receipt treatment payouts already have.
- If the treasury is out of USDC gas or Circle rejects, the card shows the same short human-readable failure line used by payouts, and the claim stays unclaimed so it can be retried.

Only the offer card changes. Approvals, mandates, batching, and the treasury panel stay as they are.

## Technical notes

- New `runClaimOffer` in `src/lib/a2h-engine.server.ts`, mirroring `runApprovePayout`: build a canonical claim payload (offer id, subject wallet, token, discounted amount, expiry), sign it with the existing mandate signer, pin the JSON as the `cid` string, and call `log(token, amount, cid)` on `DanceMoveTokens` (`0x4d13b45f…5465f0`) via Circle SCP with top-level `feeLevel: "MEDIUM"`.
- Reuse the existing ERC-1271 authorization block (`approveAuthOnChain`) so the claim carries the same contract-authorization proof as payouts.
- Expose it as `claimOffer` in `src/lib/a2h.functions.ts`; call it from `InboxCard.tsx` via `useServerFn`, replacing the bare `setActed("claimed")`.
- Cap enforcement: claims are discounts, not payouts, so they do not count against the daily payout cap; the amount logged is the discounted price for audit only.
- Failure text runs through the existing `shortFailure` mapper so Circle/RPC JSON never reaches the user.
