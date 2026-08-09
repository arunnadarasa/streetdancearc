# Update README for recent judge/demo features

The README already covers the four modes, contracts, marketplace, and lessons learned. The last few iterations added judge-facing surfaces and cleaner agent UX that are not yet documented. This plan updates the README to reflect them.

## What to add

1. **Judge-facing transaction list**
   - New subsection under "Four modes" or its own "Judge demo" section.
   - Explain that every Arc settlement (H2H cart, H2A agent run, A2A negotiation, A2H payout/claim) is persisted in a browser-side ledger (`localStorage`).
   - Surface the `/judge` route, cart drawer, and `/shop` placements.
   - Mention Arcscan status polling via `fetchTxStatuses` and copy-hash actions.

2. **Calmer H2A run UX**
   - Brief note under H2A or a "Demo UX" subsection.
   - Describe the RunLedger summary bar (status chip, progress, receipt-first Arcscan button) and collapsed JSON payloads with a master "Raw JSON" toggle.

3. **Contracts drawer / panel**
   - Add a bullet under "On-chain" or "Routes" about the contract summary panel (`ContractsPanel.tsx`) listing all four deployed contracts with Arcscan verification links and copy buttons.

4. **Agent negotiation improvements**
   - One paragraph under A2A explaining that the buyer goal is now prefilled from the live catalog with a 10% buffer, the seller can discount up to 15%, and a deterministic best-in-policy fallback closes the deal when the LLM transcript stalls.

5. **Route table updates**
   - Add `/judge` to the routes table if missing (currently `/deck` is there but `/judge` is not).

6. **Lessons learned additions**
   - Add a "What we would do differently" bullet about building the judge ledger and deterministic negotiation fallbacks earlier.
   - Add a "Best practices" bullet about keeping demo UX prose-first and hiding raw JSON behind toggles.

## What NOT to change

- No code changes.
- No deployment or secret changes.
- Keep the existing tone, structure, and line length.

## Deliverable

An updated `README.md` committed to the repo (and therefore synced to GitHub via the existing Lovable ↔ GitHub connection).
