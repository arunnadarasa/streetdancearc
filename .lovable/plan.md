# Merch first, move licensing second

Reframe the site so the streetwear store is the headline product and the on-chain move registry reads as a secondary "marketplace for moves" layer that sits behind it.

## Homepage

- **Hero**: lead with the drop. New headline along the lines of "Wear the culture. Own the move." Subline: streetwear for cyphers and battles, paid in USDC / EURC / cirBTC on Arc.
- **CTAs**: primary button becomes "Shop the drop" → `/shop`. Secondary becomes "Marketplace for moves" → move registry.
- **Stats strip**: swap chain trivia for commerce-first facts (pieces in the drop, settlement currencies, agent checkout, on-chain rights records).
- **New section directly under the hero**: featured merch — 3–4 products pulled from the live Shopify catalogue with image, title, price and add-to-cart, plus a "See the full rack" link.
- **"Three moves" flow section**: rewritten around buying merch (pick a piece → pay in stablecoins → move rights travel with the drop).
- **Move registry**: demoted to a section lower on the page, reframed as "Marketplace for moves" — register, license and settle choreography rights. Keeps the existing mint form and treasury card, just repositioned and re-copied as a secondary offer.

## Navigation and metadata

- Nav order becomes Shop · Moves · Negotiate · Markets · Deck, with Shop as the default emphasis.
- Add a `/moves` entry point that scrolls to the registry section so it has its own nav target.
- Update the homepage title and meta description to lead with streetwear commerce, keeping the rights registry as the supporting hook.

## Not changing

- Shopify catalogue, cart and checkout logic.
- The Arc contract, Privy auth, mint flow, GX/agent mode and x402 endpoints — only their placement and copy on the homepage.

## Technical notes

Work is confined to `src/routes/index.tsx`, `src/components/dance/Header.tsx`, and a new featured-merch component that reuses the existing Shopify fetch helper and `ProductCard`. No backend, contract or cart changes.
