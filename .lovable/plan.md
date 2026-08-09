# Calmer A2A demo: receipt first, infrastructure panels out of the way

On the agent-negotiation page the deal outcome — the Arc transaction — currently sits at the very bottom of the right rail, below the Agent Marketplace Discovery and Circle Rails panels. During a demo run the judge has to scroll past two long infrastructure panels to reach the thing that proves the deal settled. This reorders the page around the run.

## What changes

**1. Deal + receipt pinned to the top of the right rail**
The "Final deal" card and the on-chain receipt merge into a single sticky Deal panel at the top of the rail: state chip (negotiating / deal agreed / settled), the price line, the Settle button, and — once settled — the primary "View receipt on Arcscan" button with the short hash and copy-hash, matching the H2A and A2H treatment.

**2. Fulfilment JSON folds away**
The fulfilment object renders behind a `fulfilment object · N fields` disclosure instead of a long always-open block, with a "Raw JSON" master toggle on the deal panel for a technical reviewer.

**3. Discovery and Circle Rails move below the fold as reference material**
Both panels move under the deal panel (and, on mobile, below the transcript) inside a single collapsed "Under the hood" section with two disclosures: "Agent marketplace discovery" and "Circle rails". They stay one click away but no longer sit between the run and its receipt. On first load — before any run — the discovery disclosure opens by default so the page isn't empty.

**4. The run scrolls to its own result**
After a successful settlement the deal panel is focused/scrolled into view on mobile, where the rail stacks below the transcript, so the receipt is never something the judge has to hunt for.

**5. Empty state stays useful**
Before a run, the deal panel shows the same "run the agents, then settle" placeholder it does today, pinned at the top rather than at the bottom.

## Scope

Presentation and layout only. No changes to the negotiation loop, budget derivation, x402 settlement, or the discovery/rails data fetching.

## Technical notes

- `src/components/gx/AgentNegotiation.tsx`: restructure the right-rail column — merge the `finalQuote` card and the `receipt` section into one `DealPanel` block at the top; move `<DiscoveryPanel />` and `<CircleRailsPanel />` into a new collapsed "Under the hood" wrapper rendered after it.
- Reuse the shared `ReceiptButton` from `src/components/gx/ReceiptButton.tsx` for the Arcscan link.
- Fulfilment JSON uses `JsonBlock`'s existing `collapsible` / `defaultOpen` props.
- New small local `Disclosure` wrapper (or a native `<details>`) for the two infrastructure panels; no changes inside `DiscoveryPanel.tsx` or `CircleRailsPanel.tsx`.
- Keep `lg:sticky lg:top-28` on the rail so the deal panel stays visible while scrolling the transcript.
