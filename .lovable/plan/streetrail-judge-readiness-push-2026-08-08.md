# StreetRail — judge-readiness push

Three changes before 9 August, aimed at the gaps that separate us from the winning Arc repos. Merch stays primary throughout — nothing about the storefront's position changes.

## 1. Thesis line + "why Arc" economics

The winners were retellable in one sentence and each proved *why this chain* with numbers. We have the numbers (a $0.001 payout unit, off-chain nanoledger batching at a $0.50 threshold) but never state them where a judge lands.

- A single hero thesis line on the landing page, above the current headline: streetwear checkout and dance-move royalties settled in stablecoins, where payments are small enough that gas would normally kill them.
- A compact **Why Arc** card on the landing page: a 4-row table comparing the cost of a $0.001 royalty payout on Ethereum L1, a typical L2, and Arc, plus a line explaining that USDC *is* the gas token so there is no second asset to hold. Numbers sourced from public gas references, labelled as illustrative, no invented figures.
- The same table becomes one slide in the deck, and the thesis line replaces the current subtitle on slide 1.

## 2. Live on-chain metrics strip

Traction proxy. Read real activity from the four verified contracts instead of the hardcoded `STATS` array currently on the landing page.

- A strip showing: total registry logs, move NFTs minted, A2H payouts settled, marketplace listings, and total USDC settled — each a real number read from chain, each linking to Arcscan.
- Falls back to the current static stats if RPC is degraded, so the page never looks broken to a judge.

## 3. Guided "judge run" path

A judge who samples two surfaces may miss the strongest one. A single route walks all four modes end to end.

- New `/judge` route: four numbered steps (H2H → H2A → A2A → A2H), each with a one-line explanation of what is about to happen, a run button, and an Arcscan receipt link once the transaction confirms.
- Each step reuses the existing flow rather than reimplementing it, so there is one code path per mode.
- Progress persists in the URL so a judge can share or resume mid-run, and a "reset run" control clears it.
- Linked prominently from the landing page and the mobile drawer.

## Technical notes

- Metrics come from a new server-side aggregator that reuses the existing chunked, rate-limit-aware log sweep in `src/lib/receipts.server.ts` (plus `Transfer`/`Listed` reads for the NFT and market contracts), cached server-side for ~60s to stay inside Alchemy limits. Exposed to the client through a server function, consistent with the FX and receipts pattern.
- The judge run orchestrates existing server functions (`a2h`, `market`, `nft`, purchase/x402) — no new contracts, no new settlement logic, and it respects the current daily payout cap and treasury low-gas warning.
- Landing page stats swap from the static `STATS` constant to the live feed with the static values as fallback.
- Deck edits are additive: one new economics slide, one revised slide 1 subtitle; PPTX/PDF re-exported and every page visually checked before delivery.

## Out of scope

- Repositioning away from merch-primary.
- New contracts or mainnet.
- Trimming the deck to 10 slides (not selected).
