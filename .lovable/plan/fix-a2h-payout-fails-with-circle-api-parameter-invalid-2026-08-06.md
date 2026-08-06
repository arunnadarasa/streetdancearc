# Fix: A2H payout fails with Circle "API parameter invalid"

## What's happening

The payout request to Circle is rejected before it reaches Arc:

```text
circle_transfer_failed:400 ... "location":"gasPrice" ...
field may not be empty when 'FeeLevel PriorityFee MaxFee' fields are not set
```

Circle is saying it received no fee instruction at all, so it demands manual
`gasPrice`/`gasLimit`. The payout body currently sends the fee as a nested
object (`fee: { type: "level", config: { feeLevel: "MEDIUM" } }`), which this
API version ignores. The contract deploy call that works in this project sends
`feeLevel: "MEDIUM"` as a plain top-level string.

## The fix

1. In the shared Circle request builder (`src/lib/circle.server.ts`), replace the
   nested `fee` object with a top-level `feeLevel: "MEDIUM"` string, matching the
   shape already proven by the deploy script. This covers both the transfer and
   contract-execution paths, so the A2H sweep and the on-chain log call are both
   corrected.
2. Keep the existing failure text surfacing, but shorten Circle 4xx bodies into a
   readable one-line message in the payout card instead of dumping raw JSON —
   same treatment already applied to the RPC rate-limit banner.

## Verification

- Run an A2H payout end to end against Arc Testnet and confirm Circle returns a
  transaction id, polls to a chain hash, and the card shows a working Arcscan
  receipt link.
- If Circle still rejects, fall back to sending explicit `gasLimit` plus
  `maxFee`/`priorityFee` values for Arc rather than a fee level.

## Technical notes

- Only `src/lib/circle.server.ts` changes for the API fix; the payout card in
  `src/components/a2h/A2hHome.tsx` changes only for error text.
- No contract, schema, or secret changes.
