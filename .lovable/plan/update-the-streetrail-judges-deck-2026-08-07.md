# Update the StreetRail judges deck

Add the ERC-1271 authorization work as its own slide, refresh the slides whose content has drifted, and regenerate the downloadable PDF/PPTX to match.

## New slide: on-chain authorization (ERC-1271)

Inserted after the Circle rails slide.

- Headline: the treasury authorizes agent payouts on-chain — no EOA delegate, no exported private key.
- Two modes: pre-approved digest (`approveHash`, empty signature) and optional time-boxed delegate signer.
- Proof points: `StreetRailAuthorizer` at `0x0519c703…aac327`, verified on Arcscan, owner is the Circle treasury wallet, magic value `0x1626ba7e` returned for an approved digest and `0xffffffff` for an unknown one (both verified live).
- Public endpoint `/api/public/erc1271/authorizer` so any counterparty can verify a mandate digest.

## Refreshed slides

- **Circle rails** — add ERC-1271 as the authorization layer alongside Wallets, SCP, Nanopayments, App Kits, Gas Station, Agent Stack.
- **Protocol stack** — note that AP2 mandates are now anchored on-chain, verifiable without contacting StreetRail.
- **A2H** — mandates carry an `onChainAuth` block; renewal extends both the Ed25519 mandate and the on-chain approval.
- **Live / what we built** — add the authorizer contract address next to `DanceMoveTokens`, plus the discovery panel and per-token balances.
- **Criteria** — add a row for counterparty-verifiable authorization; keep wording aligned with what actually ships.
- **Roadmap** — move ERC-1271 authorization and Circle Discovery into "Shipped"; keep the rest of "Next" as is.

## Exported deck

Regenerate the judges deck as new versioned files so the current ones stay intact:

- `/mnt/documents/StreetRail-JudgesDeck-v2.pptx`
- `/mnt/documents/StreetRail-JudgesDeck-v2.pdf`

Same slide order and copy as the in-app deck, StreetRail palette (near-black background, signal green accent), logo on the title slide. Every slide rendered to an image and visually checked for overflow, clipping, and contrast before delivery.

## Technical notes

- Slides live in `src/components/deck/slides.tsx`; add `SlideOnChainAuth` and register it in the `slides` array between `circle` and `defi`, then renumber the `<Slide n={…} />` props that follow.
- Export built with pptxgenjs in a throwaway `/tmp` script, converted to PDF with LibreOffice, validated before writing to `/mnt/documents`.
- No contract, server, or settlement logic changes — deck content only.
