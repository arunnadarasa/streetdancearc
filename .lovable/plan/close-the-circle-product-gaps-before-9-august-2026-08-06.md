# Close the Circle-product gaps before 9 August

The judging rubric names four Circle products by name. StreetRail currently uses Circle Wallets and Circle Contracts (SCP) but none of Nanopayments, App Kits, Paymaster/Gas Station, or Agent Stack. This plan adds the three that genuinely fit, skips the one that is a no-op on Arc, and refreshes the submission assets.

Research confirmed: Arc Testnet is a first-class chain for all of these, and the treasury wallet is an **EOA** — which is what Nanopayments and Unified Balance require for signing. No blockers.

## 1. Nanopayments (highest value, ticks "agent-to-agent / service payments")

Replace the hand-rolled x402 settlement in the A2A loop with Circle's batched Gateway nanopayments.

- Add `@circle-fin/x402-batching`; server-side `GatewayClient({ chain: "arcTestnet" })` using the treasury EOA.
- New server module handling `deposit` (one-off, into the Gateway wallet), `pay(url)` for each agent purchase, and `withdraw`.
- Wire it as the settlement path behind the existing 402 challenge in the A2A mode: challenge → `pay()` → receipt. Keep the current direct-transfer path as a fallback toggle so the demo never dead-ends.
- Surface a "Batched via Circle Nanopayments" badge plus the batch/settlement detail in the on-chain receipt panel.

## 2. App Kits — Swap + Unified Balance (ticks "App Kits", strengthens the token toggle)

- Add `@circle-fin/app-kit` with the Circle Wallets adapter (server-side).
- **Swap**: back the USDC/EURC/cirBTC toggle with a real Circle swap quote + execute, instead of only converting display amounts by FX. Arc Testnet is the only testnet where Swap works, and it supports exactly those three tokens — a strong point for the judges.
- **Unified Balance**: show the treasury's aggregated USDC balance (Gateway is USDC-only; EURC/cirBTC stay on the Swap surface — the UI must not imply otherwise).
- Both surfaced in a compact "Circle rails" panel visible in H2A and A2A modes.

## 3. Gas Station instead of Paymaster (honest, and actually useful)

Circle Paymaster contracts exist on Arc, but Arc's native gas token is already USDC — Paymaster abstracts nothing there. **Gas Station** is the real sponsored-gas product and explicitly supports Arc Testnet.

- Enable Gas Station for the wallet set so agent wallets transact with zero pre-funded gas.
- Show a "gas sponsored by Circle Gas Station" line on agent-initiated transactions.
- Note in the README/deck why Paymaster is intentionally not used on Arc. Judges reward that reasoning over a box-ticking integration.

## 4. Agent Stack (smallest legitimate claim)

Agent Stack is a CLI, not an importable SDK. The sanctioned in-app equivalent:

- Call the public, keyless Agent Marketplace Discovery API (`GET https://api.circle.com/v2/x402/discovery/resources`) so the buyer agent discovers x402 services rather than using a hardcoded endpoint.
- Pay discovered services through the Nanopayments client from step 1 — which is exactly what the CLI does internally.

## 5. Submission polish

- 3-minute video pitch: written script + shot list mapped to the four modes and the on-chain receipts (I can produce the script and a screen-capture run order; recording is yours).
- Deck: new slides for the Circle product stack (Wallets, Contracts, Nanopayments, App Kits, Gas Station, Agent Stack discovery) and a rubric-alignment slide. Regenerate PDF + PPTX.
- README + submission copy: restate against the Agentic Economy criteria — decision logic tied to real signals (live FX + spend policy), autonomous USDC spending, named Circle products.

## Order of work

1. Nanopayments + Discovery API (the two rubric bullets with the most weight).
2. App Kit Swap + Unified Balance.
3. Gas Station toggle.
4. Deck, README, video script.

## Technical notes

New: `src/lib/nanopay.server.ts`, `src/lib/appkit.server.ts`, `src/lib/discovery.server.ts`, plus thin `*.functions.ts` wrappers. Touched: A2A settlement path, `src/lib/settle.ts`, the pay-token toggle, the receipt panels, `src/components/deck/slides.tsx`, `README.md`. Secrets: existing `CIRCLE_API_KEY` + `CIRCLE_ENTITY_SECRET` cover it; an optional Circle "kit key" improves Swap rate limits and can be added later. No new chain deploy, no Lovable Cloud.

Every new path keeps a demo-safe fallback so nothing in the judge demo can hard-fail on a rate limit or testnet hiccup.
