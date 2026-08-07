# Update README + slide deck

## README

The README already covers the major recent features (ERC-1271 authorizer, on-chain A2H claim offers, treasury panel, Lovable Cloud). Two small additions will keep it in sync with the slide deck and the latest UI:

1. **Mobile UX subsection** under `Four modes`
   - Mention the hamburger sheet, the wallet-section drawer, and the footer with GitHub/Arcscan links.
2. **Claim offers callout** in the A2H paragraph
   - Already present; just tighten the wording to match the deck.

## Slide deck (`src/components/deck/slides.tsx`)

The deck is at 16 slides. Add one focused slide and refresh two existing ones rather than expanding the deck length significantly.

### Add: Slide "Claim offers on-chain" (after SlideOnChainAuth, before SlideDefi)
- Title: "Agent-to-human offers, logged on Arc"
- Show the claim flow: Drop Agent pushes an offer → user taps Claim → treasury logs `srclaim:` CID to `DanceMoveTokens` via Circle SCP → claim code + Arcscan receipt + signed AP2 `OfferClaim` mandate.
- Note: no user wallet prompt, no user gas, discount applies at checkout, claims do not count against payout caps.
- Include the two contract addresses as receipts.

### Refresh: SlideRoadmap
- Add to **Shipped**:
  - "On-chain claim offers (A2H)"
  - "Treasury balance panel + low-gas warning"
- Update **Next** timeline to reflect Demo Day (9 Aug 2026) and post-hackathon.

### Refresh: SlideA2h
- Add one bullet about claim offers in the A2H quadrant card or the bottom paragraph.

### Export
- Regenerate `StreetRail-JudgesDeck-v3.pptx` and `StreetRail-JudgesDeck-v3.pdf` to `/mnt/documents/` after the in-app deck renders correctly.

## Out of scope
- No new app routes or backend logic.
- No changes to the contract.
