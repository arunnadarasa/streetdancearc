# Agent-to-agent negotiation that actually closes

An LLM buyer agent and an LLM seller agent negotiating over a catalog, then
settling on Arc. The settlement leg is the easy part. The demo fails in the
*negotiation* leg, and it fails silently: a polite transcript that ends with
"unfortunately that's outside my budget" and no quote to pay.

Target: ~90% of runs end in a deal, and the ~10% that don't say why.

## 1. Never hardcode the budget

The single biggest cause of a dead demo. A goal string like
`"buy a snapback for under 0.03 USDC"` against a catalog whose cheapest
snapback is `0.047` can only ever produce a refusal — the model is behaving
correctly.

Derive the budget from the live catalog at request time:

```ts
function deriveBudget(catalog: Item[], category?: string) {
  const pool = category ? catalog.filter(i => i.category === category) : catalog;
  const cheapest = Math.min(...pool.map(i => i.priceUsd));
  // headroom so the buyer has room to concede, capped by the spend policy
  return Math.min(cheapest * 1.35, POLICY.maxTicketUsd);
}
```

Render the derived number into the buyer prompt. Never let a human-typed goal
string be the only source of a numeric constraint — parse a user-supplied
number if present, but clamp it up to at least the derived floor and tell the
user you did.

## 2. Give the seller a floor, and forbid flat refusals

A seller prompted only with a list price has exactly one move. Put both
numbers in the prompt and name the allowed moves:

- `listUsd` and `floorUsd` (e.g. 15% below list) rendered explicitly.
- "You may discount down to the floor. You may substitute a cheaper item in
  the same category. You may not refuse outright — always counter."
- Never expose the floor as a negotiating position in turn one; discount in
  steps so the transcript reads like a negotiation.

## 3. Name the final turn

Both agents get "this is turn N of M; on the final turn you must accept the
best offer on the table if it is within policy." Models will happily haggle
until the loop runs out otherwise. Keep M small (4–5); more turns lower the
close rate because there's more room to wander.

## 4. Deterministic close — prompts never own the success rate

Prompt tuning gets you to maybe 70%. The last 20 points come from code that
runs *after* the loop:

```ts
// track every quote the seller ever put on the table
const inPolicy = quotes.filter(q => q.totalUsd <= budget && q.totalUsd >= floorFor(q.sku));
if (!outcome.accepted && inPolicy.length) {
  const best = inPolicy.sort((a, b) => a.totalUsd - b.totalUsd)[0];
  outcome = { accepted: true, finalQuote: best, closedBy: "fallback" };
  transcript.push(syntheticAcceptTurn(best)); // so the UI reads coherently
}
```

Mark the fallback (`closedBy: "fallback" | "agent"`) rather than hiding it —
it's honest, and it's a talking point about deterministic guard-rails around
non-deterministic agents.

## 5. Treat every LLM-emitted price as untrusted input

Before a quote reaches a settlement path:

- **Normalise units.** Models flip between decimals and minor units
  (`0.015` vs `15000`). If the value is >1000× the catalog price, divide by
  1e6 rather than trusting it.
- **Clamp** to `[floorUsd, listUsd]` for the quoted SKU.
- **Re-derive** the total from the catalog price × quantity; use the model's
  number only to pick the SKU and the discount, never as the amount charged.
- **Reject unknown SKUs.** Match against the catalog, don't accept invented ids.

The chain leg then only ever sees a number your own code produced.

## 6. Model the no-deal explicitly

The remaining failures should be *legible*, not a transcript that trails off.
Return a structured outcome:

```ts
type Outcome =
  | { accepted: true; finalQuote: Quote; closedBy: "agent" | "fallback" }
  | { accepted: false; reason: string };  // e.g. "No in-policy quote under $0.04 after 5 turns"
```

Render `reason` in the UI next to the transcript. A guard-rail that visibly
fires is a feature; a silent stall is a bug.

## 7. Testing the close rate

Run the loop 20× headless against the real catalog and count `accepted`. Do
this after any prompt edit — prompt changes regress the close rate in ways
that a single manual run will not surface. If the rate drops, add code, not
adjectives.
