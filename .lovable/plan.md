# Make the agent negotiation close a deal ~90% of the time

Today the run often ends with "Unfortunately, I don't have a cheaper snapback cap available." Three reasons, all confirmed in the code:

1. The default goal is hardcoded to "under 0.03 in the selected stablecoin", but the live catalog prices a snapback at ~0.047 USDC. The buyer's budget is below every matching item, so a reject is the *correct* behaviour of the current prompts.
2. The seller agent has no room to move — its prompt says "only quote items from the catalog" at list price, so it can never meet a counter-offer.
3. Nothing forces convergence: the loop just runs out of turns and whatever the last message said becomes the outcome, with no final quote.

## What changes

**1. Budget derived from the catalog, not hardcoded**
The default goal stops naming a fixed number. Instead the buyer is given a budget computed at run time from the actual catalog (a small headroom above the cheapest item in the requested category) and capped by the spend policy's per-item limit. A budget that can't buy anything is what makes the demo fail.

**2. Seller gets a discount ladder**
The seller prompt gains an explicit floor: it may discount down to a set percentage off list (proposed: up to 15%) across the negotiation, in decreasing steps. It must counter with a discounted price rather than refuse, and may substitute a cheaper in-category item when the buyer's budget is genuinely below its floor.

**3. Forced convergence on the last turn**
Both agents are told which turn is final. On the final turn the buyer accepts the best quote on the table if it is within policy, and the seller makes its best-and-final offer instead of a plain refusal.

**4. Deterministic safety net**
After the loop, if no accepted quote exists but the seller ever put a quote on the table that is within the spend policy, that quote becomes the final quote and the transcript gets a closing "deal agreed" turn. Only a genuinely policy-breaching or empty-catalog run ends with no deal — which keeps the policy demo honest (the guard-rail can still visibly stop a run).

**5. Honest failure copy**
When a run does end without a deal, the panel says why in one line (over per-item cap / category not allowed / catalog empty) rather than trailing off in chat.

## Technical notes

- `src/lib/agent-negotiation.functions.ts`: compute budget + discount floor from the catalog and policy, pass turn index and "final turn" flags into both system prompts, add the post-loop fallback that promotes the best in-policy seller quote to `finalQuote`, and return a `outcome: "accepted" | "fallback" | "no-deal"` plus a `reason`.
- `src/components/gx/AgentNegotiation.tsx`: default goal text without a hardcoded price, and render the outcome reason when there is no deal.
- No prompt change makes an LLM deterministic — the fallback in step 4 is what actually delivers the ~90%. Bumping default turns from 4 to 5 gives the ladder room to converge.
- No schema, database, or contract changes.
