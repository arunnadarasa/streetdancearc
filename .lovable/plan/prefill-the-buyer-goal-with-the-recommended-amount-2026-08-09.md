# Prefill the buyer goal with the recommended amount

The goal box currently ships a fixed sentence with no number (and the published build still shows a stale hardcoded `under 0.045`). The server already derives a sensible budget from the live catalog, but the user never sees it until the run finishes. Make the recommended amount the visible default.

## What changes

- Compute the same recommended budget on the client that the server derives: cheapest item in an allowed category, plus ~10% headroom, capped by the per-item spend policy.
- Once the catalog and FX rates have loaded, rewrite the default goal to include that number, e.g. `Buy a snapback cap under 0.052 USDC in the selected stablecoin for practice sessions`. Rounded to 3 decimals so it reads cleanly.
- Only overwrite the goal while it is still untouched. As soon as the user types in the box, the prefill stops updating.
- Show a small hint line under the input: `Recommended budget 0.052 USDC — derived from the live catalog` with a "Reset to recommended" link that restores the prefilled sentence.
- The category word in the sentence follows the cheapest allowed item, so the default goal always names something that is actually buyable at that price.

The policy numbers, the negotiation loop, and the server-side derived budget stay exactly as they are — this only changes what the input starts with.

## Technical notes

- Extract `deriveBudget` from `src/lib/agent-negotiation.functions.ts` into a shared client-safe module (`src/lib/negotiation-budget.ts`) and import it from both the server function and the component, so the displayed number and the number the agents use can't drift.
- Move the policy object in `src/components/gx/AgentNegotiation.tsx` out of `onRun` into a module constant so the recommendation and the run use one source.
- Prefill via a `useEffect` on the memoised `catalog`, guarded by a `goalDirty` ref set in the textarea's `onChange`.
