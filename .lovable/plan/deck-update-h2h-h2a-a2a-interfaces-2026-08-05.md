# Deck update: H2H, H2A, A2A interfaces

The deck currently has 11 slides and covers the agent story in one slide ("The Rights Agent files receipts while you sleep"). It never names the three interaction modes the app actually ships: the human shop (H2H), the human-supervised agent run with spend policy and confirmation interrupts (H2A), and the agent-to-agent negotiation over A2A/AP2/UCP settling with x402 (A2A).

## What changes

**New slide: "Three interfaces, one rail"** (inserted after "What we built")
A three-column layout, one column per mode:
- H2H — human shop: browse, cart, checkout, Privy Google login, multi-stablecoin pay.
- H2A — human delegates to an agent: spend policy caps, confirmation interrupt above threshold, run ledger the human can audit.
- A2A — buyer agent negotiates with seller agent: A2A 0.3 message/send, AP2 mandates, UCP checkout, x402 settlement.
Footer line: all three settle to the same Arc Testnet contract in USDC.

**New slide: "A2A protocol stack"** (inserted after the agent slide)
Layered diagram, top to bottom: A2A 0.3 transport → AP2 intent/cart/payment mandates → UCP discovery + checkout + conformance self-test → x402 payment challenge → Arc Testnet USDC settlement, with a real tx hash callout.

**Edited slide: the existing agent slide** is reframed as the H2A story explicitly (policy, interrupt, ledger) so it doesn't overlap the new A2A slide.

**Edited slide: title slide pills** gain an "H2H · H2A · A2A" pill.

**Edited slide: criteria** gets one row tying the three-mode design to the agentic-economy judging bullet.

**Counters** — the deck grows from 11 to 13 slides; the slide chrome total and each slide's index number are renumbered.

## Technical notes

- `src/components/deck/slides.tsx` — add `SlideInterfaces` and `SlideProtocolStack`, renumber every `<Slide n={...} />`, update `Chrome`'s default `total` to 13, and register both in the `slides` array in order.
- No changes to `Deck.tsx` (it derives count from `slides.length`) or to any app logic.
- Mobile: both new slides follow the existing responsive pattern — stacked single column below `sm`, tightened type scales, content sized to fit the 3:4 mobile frame.
- Verification: Playwright at 390px and 1280px stepping through the two new slides, checking no overflow and no collision with the chrome strip.

## Out of scope

- Regenerating the downloadable PDF/PPTX (they will be out of date with the in-app deck unless you want them refreshed too).
