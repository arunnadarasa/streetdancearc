# Add missing 4th contract link to mobile burger drawer

## Current state
The codebase has 4 deployed contracts on Arc Testnet:
1. DanceMoveTokens — `0x4d13b45f823f8944522890c20d8695b6005465f0`
2. StreetRailAuthorizer — `0x0519c703cde7cbff6829fdfdcfe8c9a4c7aac327`
3. StreetRail Move Rights NFT — `0x84546970f5265f31ae1523a1e3bf18938670702f`
4. MoveMarket v2 — `0x5b00367612ef4533e89ed9547dd4c2f3080f783e`

`src/components/dance/MobileDrawer.tsx` only renders 3 Arcscan links (DanceMoveTokens, StreetRailAuthorizer, MoveMarket). The Move Rights NFT link is missing.

## Goal
Surface all 4 deployed contracts in the mobile navigation drawer so users can inspect every contract on Arcscan.

## Changes
1. In `src/components/dance/MobileDrawer.tsx`, add a constant for the Move Rights NFT address (`0x84546970f5265f31ae1523a1e3bf18938670702f`).
2. Add a new Arcscan link row labeled "Move Rights NFT on Arcscan" between the existing contract links, using the same styling and `ExternalLink` icon pattern.
3. Optional: import the address from `src/data/move-nft.json` instead of hardcoding, to keep the drawer in sync with the deployment artifact.

## Verification
- Open the mobile burger menu in the preview.
- Confirm 4 contract links appear: DanceMoveTokens, StreetRailAuthorizer, Move Rights NFT, MoveMarket.
- Tap each link and confirm it opens the correct Arcscan address.

## Out of scope
- No changes to contract deployments, ABIs, or business logic.
- No desktop header changes unless required for consistency.
