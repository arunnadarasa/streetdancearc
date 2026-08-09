# Plan: Add MoveMarket v2 and Move Rights NFT quick links

## Goal
Surface the two marketplace contracts (Move Rights NFT and MoveMarket v2) as direct Arcscan links in the **homepage header** and **homepage footer** so visitors can verify them in one click.

## Current state
- `src/lib/contracts.ts` already exports `CONTRACTS` with all four deployed contracts and their Arcscan URLs.
- The header has a generic "Contracts" sheet that lists all four contracts.
- The footer has a "Contracts" button that opens the same sheet.
- The homepage (`/`) renders `Header` and `SiteFooter` directly.

## Changes

### 1. New component: `QuickContractLinks`
Create `src/components/dance/QuickContractLinks.tsx`.
- Accepts a list of contract keys from `CONTRACTS`.
- Renders compact external-link chips with the contract short name + `ExternalLink` icon.
- Uses `shortAddress` from `src/lib/contracts.ts` for the address snippet.
- Responsive: icon-only on `md`, full label on `lg+`.

### 2. Header: optional quick-links prop
Update `src/components/dance/Header.tsx`.
- Add `quickContracts?: boolean` prop.
- When `true`, render `<QuickContractLinks keys={["moveNft","market"]} />` inside the right-hand control cluster, before the existing `ContractsSheet`.
- Hide the quick links on mobile (`hidden md:flex`) so they do not re-introduce overflow.

### 3. Homepage route
Update `src/routes/index.tsx`.
- Pass `quickContracts` to `<Header />` so the links appear only on the homepage.

### 4. Footer quick links
Update `src/components/layout/SiteFooter.tsx`.
- Add two inline Arcscan links after the "Contracts" button:
  - "Move Rights NFT"
  - "MoveMarket v2"
- Keep the existing "Contracts" sheet opener so users can still see all four contracts.

### 5. Verification
- Run the build/typecheck to confirm imports resolve.
- Check the homepage at desktop and mobile widths to ensure no header overflow and that the new links are reachable.

## Out of scope
- No changes to the contracts data or the full ContractsSheet/drawer behavior.
- No new pages or backend logic.
