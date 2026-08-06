# Fix the failing batch settlement on Arc

Your screenshot shows two separate problems on the payout inbox.

## What the screenshot shows

1. **Circle rejected the transfer**: `API parameter invalid ... 'gasPrice' field may not be empty when 'FeeLevel PriorityFee MaxFee' fields are not set`. Circle did not see any fee instruction on the request.
2. **The raw error is dumped into the UI** as a wall of JSON under the "Settle now" card, instead of the one-line human message.

## What is confirmed in the code today

- `src/lib/circle.server.ts` already sends `feeLevel: "MEDIUM"` as a top-level field on both the transfer and the contract-execution request.
- `src/lib/a2h-engine.server.ts` already converts failures through `humanizePayoutError` before returning `detail`.

So the running build you tested is either the pre-fix published bundle, **or** Circle does not accept the top-level `feeLevel` shape on this endpoint. That is unconfirmed — step 1 settles it before anything is changed.

## Plan

1. **Reproduce against the real Circle API** from the sandbox: call the exact developer transfer endpoint with the current body (top-level `feeLevel`) for a tiny amount to the treasury's own address, and read the raw status and body. This tells us whether the current code is already correct and you simply hit an old build.
2. **If Circle still rejects it**, switch the fee instruction to the shape its response demands — the nested `fee: { type: "level", config: { feeLevel: "MEDIUM" } }` object — and keep a `gasLimit`/`maxFee` fallback only if the level form is unsupported on Arc. Apply the same shape to the registry `contractExecution` call so the log write does not fail after the transfer succeeds.
3. **Re-run the same probe twice** after the change (transfer + contract execution) and confirm a real tx hash comes back and appears on Arcscan for the treasury address.
4. **Stop leaking raw provider JSON to the UI**: route the batch-settle failure in `src/components/a2h/A2hHome.tsx` through the same humanized one-liner, cap it to a single line, and put the raw provider text behind the existing "Show protocol" style disclosure rather than inline.
5. **Publish** and confirm the live site returns the human message (or a real settlement) rather than the JSON dump.

## Technical notes

- Files touched: `src/lib/circle.server.ts` (fee field shape), `src/lib/a2h-engine.server.ts` (error mapping if a new failure class appears), `src/components/a2h/A2hHome.tsx` (error presentation).
- No schema, route, or theme changes; the settlement flow, nanoledger threshold and token toggle stay as they are.
- Verification is a real Circle call from the treasury wallet, so the sweep spends a few cents of testnet USDC.
