# Update README and judges deck for marketplace browse

Bring both the GitHub README and the judges deck up to date with the latest shipped work: marketplace search, category/license/token filters, sorting, shareable filtered URLs, and the ERC-2981 royalty split already live on buys.

## README

- Extend the marketplace section with a short "Browse and discovery" subsection: search across move name, token ID, discipline and seller; discipline chips; license-type filter; payment-token filter; sort by newest / price low-high / price high-low / payment token.
- Note that filters live in the URL (`?q=&cat=&license=&tok=&sort=`) so a filtered view is shareable.
- Note that "newest first" comes from joining the on-chain `Listed` event block number via the activity indexer.
- Confirm the contract address table lists MoveMarket v2 (`0x5b00367612ef4533e89ed9547dd4c2f3080f783e`) everywhere, and add filters to the feature bullet list at the top.

## Slide deck

- Update the marketplace slide (`SlideMarketplace` in `src/components/deck/slides.tsx`) to add a "Browse" row covering search, filters and sorting, and mention shareable filtered links in the footer note alongside the royalty line.
- Keep the deck at 18 slides — no new slide, since browse is a refinement of the existing secondary-market story.

## Export

- Regenerate the PPTX and PDF as `StreetRail-JudgesDeck-v6.pptx` / `.pdf` in the documents area, matching the existing dark green/black brand styling.
- Convert every exported page to an image and inspect each one before delivering, fixing any clipped or overflowing text.

## Technical notes

- Files touched: `README.md`, `src/components/deck/slides.tsx`, plus a throwaway export script under `/tmp`.
- No contract, route or data-layer changes; the in-app deck at `/deck` picks up the slide edit automatically.
- GitHub sync is bidirectional, so the README change reaches the repo on the next push.
