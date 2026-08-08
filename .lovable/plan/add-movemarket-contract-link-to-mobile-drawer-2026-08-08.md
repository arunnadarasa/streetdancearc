# Add MoveMarket contract link to mobile drawer

## Goal
Surface the third on-chain contract — the MoveMarket marketplace — alongside the existing DanceMoveTokens and StreetRailAuthorizer links in the mobile navigation drawer.

## Why
The marketplace is a core demo flow (list / buy / transfer move rights). Judges and users checking on-chain activity expect all three deployed contracts to be reachable from the drawer.

## Change
1. In `src/components/dance/MobileDrawer.tsx`:
   - Add `const MARKET_ADDRESS = "0xe692d23b253c5ff52369bf950ed8bc6aa90b97e5";`
   - Add a new external link row below StreetRailAuthorizer: **"MoveMarket on Arcscan"** pointing to `${ARC_EXPLORER}/address/${MARKET_ADDRESS}`.

## Verification
- Open the mobile drawer in preview.
- Confirm three contract links appear: DanceMoveTokens, StreetRailAuthorizer, MoveMarket.
- Tap MoveMarket and confirm it opens the correct Arcscan address.
