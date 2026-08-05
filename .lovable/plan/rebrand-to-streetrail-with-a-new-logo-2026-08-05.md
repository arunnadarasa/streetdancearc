# Rebrand to StreetRail with a new logo

Adopt **StreetRail** as the product name across the site, and introduce a proper brand mark to replace the current `♪` gradient tile in the header.

## Logo

Generate a square brand mark in the Midnight Indigo palette: an abstract "rail" motif — parallel lines with a stepped break, reading as both a cypher line on the floor and a payment rail — set on a deep indigo tile with an electric-violet glow. Saved as a transparent PNG in `src/assets/`, plus a downscaled square copy at `public/favicon.png` wired into the root route's `head().links` (replacing the default `favicon.ico`, which gets deleted).

## Where the name changes

- **Header** (`src/components/dance/Header.tsx`) — logo mark image swaps in for the `♪` tile; wordmark becomes "StreetRail", tagline reframed to lead with merch on Arc.
- **Footer** (`src/components/layout/SiteFooter.tsx`)
- **Route metadata** — `head()` titles/descriptions and og/twitter tags on `index`, `shop`, `product.$handle`, `moves`, `markets`, `deck`, `agent-negotiation`.
- **Deck** (`src/components/deck/slides.tsx`) — title slide and any in-copy references.
- **Agent surface** — `src/lib/agent-card.ts` and `src/routes/api/public/a2a/message.ts` agent name/description strings.
- **Mint form** (`src/components/dance/MintForm.tsx`) copy.
- **README** — heading and pitch line.

## Kept as-is

"Dance Move Tokens" stays as the name of the on-chain feature and the deployed contract (`DanceMoveTokens.sol` is live and verified — no redeploy). StreetRail is the product; Dance Move Tokens is the registry inside it.

## Verification

Screenshot home, shop and deck at 390px and desktop to confirm the mark renders, the header doesn't truncate, and no stale name remains.
