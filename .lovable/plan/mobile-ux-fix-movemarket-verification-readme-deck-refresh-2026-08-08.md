# Mobile UX fix, MoveMarket verification, README + deck refresh

## 1. Mobile UX — stop the sideways scroll in the Move Registry

The screenshots show the whole page shifted sideways: the pinned-CID link, the long
"pinned CID differs…" note and the JSON metadata block all push past the screen edge,
so the header, form fields and currency toggle end up half off-screen.

Fixes, all presentation-only:

- Long IPFS links and CID strings wrap instead of extending the page (`break-all`,
  `min-w-0` on their containers).
- The JSON preview block scrolls **inside its own box** rather than dragging the page:
  give the `<pre>` in `MetadataPreview` a contained width and horizontal scroll of its
  own, with a subtle hint that it is scrollable.
- The "Clip pinned" card and its warning line wrap on narrow screens; size/duration
  metadata stacks instead of overflowing.
- Add a page-level overflow guard on the registry section so no child can widen the
  viewport.
- Re-check the same pattern in the receipt history panel and the market panel (both
  render CIDs/addresses) and apply the same wrapping.

Verified at 384px in the browser before finishing.

## 2. Verify MoveMarket.sol on Arcscan

`scripts/verify-arc.mjs` already accepts source/data/name arguments, so this is a run,
not a rewrite:

```
node scripts/verify-arc.mjs contracts/MoveMarket.sol src/data/move-market.json MoveMarket
```

Constructor arguments are auto-detected by Blockscout. After submission, poll
`https://testnet.arcscan.app/api/v2/smart-contracts/0xe692…97e5` until
`is_verified: true`. If the constructor argument is not auto-detected, resubmit with the
ABI-encoded NFT address (`0x84546970f5265f31ae1523a1e3bf18938670702f`) explicitly.

## 3. README

Add the marketplace to the on-chain section: MoveMarket address, its non-custodial
design (seller keeps the token, grants approval only), list/cancel/buy/transfer flow,
settlement in USDC/EURC/cirBTC, and the verified-contract link. Also document the clip
preview step (local duration/size probe + browser-computed CIDv1 before pinning, and the
chunked-CID caveat above 256 KB) and the `/market` route in the routes table.

## 4. Slide deck

Add one slide, "Secondary market for move rights", after the claim-offers slide: the
marketplace contract, the three settlement currencies, gas in USDC, and the
non-custodial listing model. Update the "what's live" slide counts and the roadmap line
that still treats resale as future work. Then regenerate the exported PDF and PPTX as
v4 in the documents folder.

## Technical notes

- No contract redeploys; verification only.
- Deck export reuses the existing generation script, bumping the version suffix.
