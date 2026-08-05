# A2H — Agent to Human

Today StreetRail covers three directions: H2H (a human shops), H2A (a human delegates to an agent) and A2A (agents settle with each other over x402). A2H is the missing fourth: **the agent starts the conversation and a human is the endpoint.**

Nobody clicks anything. The Rights Agent watches the rail, sees a move earn, pays the choreographer in USDC, and pushes a receipt to their inbox. When it wants to do something outside its mandate, it asks.

## What gets built

A fourth mode in the existing toggle: `H2H · H2A · A2A · A2H`.

The A2H view is a **payout inbox** — a reverse-chronological feed of agent-initiated messages, each one a card the human can read, expand, and act on:

- **Payout pushed** — "Rights Agent paid you 2.40 USDC for `krump-2024-w32` (1,204 plays)." Shows the AP2 mandate it acted under, the token, and a clickable Arcscan receipt.
- **Approval requested** — the payment exceeds the standing mandate ceiling, so the agent pauses and asks. Approve / decline buttons, and declining is recorded on the thread.
- **Offer pushed** — "cirBTC moved; your snapback drops 8% for 6h." Claim or dismiss.
- **Mandate expiring** — "Your standing payout authorization ends in 3 days. Renew?"

A standing-authorization panel sits above the feed: token, per-payout cap, daily cap, expiry. It is the same AP2 mandate shape the H2A guardrails already use, just pointed the other way — the human pre-signs *receive and notify* instead of *spend*.

Each card carries the raw A2A `message/send` envelope behind a "show protocol" disclosure, reusing `JsonBlock` so links stay clickable — this is what makes it legible to judges rather than just another notification list.

Demo data is deterministic and seeded (same content on every load), consistent with how the A2A negotiation demo already runs. Where a payout references a real on-chain event, it links the deployed `DanceMoveTokens` contract on Arcscan.

## Deck and docs

- New slide after the interfaces slide: the four directions as a 2×2 (who initiates × who receives), with A2H called out as the one nobody builds because there was no rail to push value over.
- Update the existing "three interfaces, one rail" slide to four.
- Update the protocol-stack slide to note A2A `message/send` runs outbound in A2H, AP2 mandate is the standing authorization, x402 settles, Arc is the receipt.
- README gets a short A2H section alongside the other three modes.
- Regenerate `judges-deck.pdf` and `judges-deck.pptx` from the updated deck.

## Technical notes

- `src/lib/gx-mode.ts`: extend `GxMode` with `"a2h"`, add it to `normalize()` and the `?mode=a2h` deep link.
- `src/components/gx/ModeToggle.tsx`: fourth option. At 384px four pills are tight — drop pill padding a step and keep labels at three characters so the header does not wrap.
- New `src/components/a2h/`: `A2hHome.tsx` (inbox shell + standing-authorization panel), `InboxCard.tsx` (one agent-initiated message, expandable, action row), `a2h-feed.ts` (seeded messages + mandate shape).
- `src/routes/index.tsx`: branch `mode === "a2h"` to `<A2hHome />` alongside the existing H2A/A2A branch.
- Reuse `JsonBlock` for envelopes and the existing Arcscan link helper for receipts. No new routes, no backend, no database — same static-demo posture as A2A.
- Deck: add slides to `src/components/deck/slides.tsx`, then re-run the existing Playwright capture → PDF/PPTX pipeline.
