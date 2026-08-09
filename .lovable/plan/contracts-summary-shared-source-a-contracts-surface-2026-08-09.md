# Contracts summary: shared source + a "Contracts" surface

Right now the four deployed Arc Testnet contracts are only listed inside the mobile burger drawer, with the addresses hardcoded there. This adds a single shared definition and surfaces it in a proper contracts panel available on desktop too.

## What gets built

**One source of truth**
- A small module listing the four contracts: name, role in one line, address, Arcscan link, and the standards they implement.
  - DanceMoveTokens — `0x4d13b45f…65f0` — move registry + on-chain receipts
  - StreetRailAuthorizer — `0x0519c703…c327` — ERC-1271 agent/treasury authorization
  - Move Rights NFT (MOVE) — `0x84546970…702f` — ERC-721 + ERC-2981 move rights
  - MoveMarket v2 — `0x5b003676…f783e` — listings, buys, atomic royalty split
- Each entry carries a verified flag, and the panel shows a "Verified on Arcscan" badge and a copy-address button.

**Contracts drawer (all screen sizes)**
- A "Contracts" button in the desktop header actions row (next to the currency selector) opens a right-hand sheet listing the four cards: name, role, standards chips, truncated address with copy, and an "Arcscan" link that opens in a new tab.
- Footer caption inside the sheet: "Arc Testnet · chain 5042002 · USDC is gas".

**Contracts section on the judge page**
- The same list rendered inline as a section at the bottom of `/judge`, so a judge reviewing the guided run can verify all four addresses without opening a menu.

**Mobile drawer reuse**
- The burger drawer's four hardcoded contract links are replaced with the shared list, so the two never drift apart again.

**Footer**
- Add a "Contracts" link in the footer link row that opens the same drawer.

## Technical notes

- New `src/lib/contracts.ts` exporting `CONTRACTS` (name, blurb, address, standards, verified) and using `ARC_EXPLORER` from `src/lib/tokens.ts` to build links. Addresses are taken from the existing `src/data/*.json` artifacts where present so redeploys flow through.
- New `src/components/dance/ContractsPanel.tsx` rendering the card list, plus `ContractsSheet.tsx` wrapping it in the existing shadcn `Sheet` with a header trigger.
- `Header.tsx`: add the trigger to the desktop actions row (hidden below `md`, since mobile already has the drawer).
- `MobileDrawer.tsx`: replace the four hardcoded blocks with a map over `CONTRACTS`.
- `src/routes/judge.tsx`: render `<ContractsPanel />` in a new section.
- Presentation and links only — no contract calls, no changes to settlement, market or payout logic.
