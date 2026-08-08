# Automatic royalty settlement on marketplace buys

Every sale of a Move Rights NFT should pay the creator's 5% royalty in the same
stablecoin the buyer pays with, in the same transaction — no trust, no manual step.

Confirmed on-chain: the Move Rights contract already exposes a standard 5% royalty
(ERC-2981) pointing at the treasury address, so the split can be read from the token
itself rather than hardcoded.

## How the money splits

Royalty is carved out of the listed price. A move listed at 100 USDC:

```text
buyer pays        100.00 USDC
  -> creator        5.00 USDC   (5%, read from the token's royalty setting)
  -> seller        95.00 USDC
buyer receives    the move NFT
```

Same rule for EURC and cirBTC — the royalty settles in whichever token the listing
is priced in.

## What changes

1. **New marketplace contract (v2).** The live marketplace is immutable, so royalty
   enforcement needs a fresh deploy. On each buy it reads the token's royalty
   receiver and amount, transfers the royalty to the creator, the remainder to the
   seller, and the NFT to the buyer — one atomic transaction. If a token declares no
   royalty, the seller gets everything.
2. **Cutover.** The new contract fully replaces the old one; the old address is
   dropped from the app. Any active listings must be re-listed. Deployed from the
   Circle treasury wallet and verified on Arcscan, like the current contracts.
3. **Buy flow shows the split.** Before confirming, the buyer sees "You pay X ·
   creator receives Y · seller receives Z" with the royalty percentage and the
   creator address. Approval amount stays the full listed price.
4. **Seller sees net proceeds.** The listing form shows what the seller will actually
   receive after the royalty carve-out, live as the price is typed.
5. **Activity panel.** Sale rows gain a royalty line ("5.00 USDC royalty to 0x676…"),
   sourced from the new royalty event, with the same Arcscan links.
6. **Docs.** README and the judges deck get a short "creator royalties settle on-chain"
   note; the deck's royalty slide references the live contract.

## Technical details

- `contracts/MoveMarket.sol` → v2: add `IERC2981.royaltyInfo(tokenId, price)` inside
  `buy()` wrapped in a low-level `try/catch` so a non-royalty token still sells;
  two `transferFrom` calls (royalty, then remainder), guard `royalty <= price`, and
  emit `RoyaltyPaid(tokenId, receiver, payToken, amount)` alongside `Sold`.
- Deploy with `scripts/deploy-arc.mjs` pattern (solc 0.8.24, optimizer 200 runs,
  Circle SCP from the treasury wallet), write the new address/ABI to
  `src/data/move-market.json`, then verify via `scripts/verify-arc.mjs`.
- `src/lib/market.server.ts`: add a `royaltyInfo` read so listings carry
  `royaltyAtomic` / `royaltyReceiver` / `sellerNetAtomic`.
- `src/components/market/MoveMarketPanel.tsx`: split breakdown in the existing
  confirm step; reuse `chain-errors.ts` mapping for a new `royalty_failed` revert.
- `src/lib/market-activity.server.ts`: decode `RoyaltyPaid` and attach it to the
  matching `Sold` row (explorer log sweep + RPC fallback, both paths).
- Mobile drawer's third Arcscan link points at the new market address.

## Out of scope

- Changing the 5% rate or the royalty receiver (both live on the NFT contract).
- Royalties on direct wallet-to-wallet transfers — those bypass the marketplace by
  design and stay free.
