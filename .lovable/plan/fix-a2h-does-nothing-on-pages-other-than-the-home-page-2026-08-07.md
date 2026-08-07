# Fix: A2H does nothing on pages other than the home page

## What's happening

The A2H button does switch the mode — the pill highlights and the URL updates — but only the home page knows how to render the A2H view. Every other page falls back to the A2A screen, so the content looks frozen.

Your screenshots are the Shop page: both A2A and A2H show the same "storefront, as an agent reads it" view.

Confirmed in the code:

- `src/routes/index.tsx` handles all four modes (h2h / h2a / a2h / a2a).
- `src/routes/shop.tsx` and `src/routes/product.$handle.tsx` only branch on `h2a`, and treat everything else as A2A.
- `src/routes/moves.tsx`, `src/routes/markets.tsx` and `src/routes/agent-negotiation.tsx` don't react to the mode at all.

## The fix

1. Add one shared component (`src/components/gx/ModeSurface.tsx`) that takes the current mode plus the page's own H2H content and the page's A2A content, and renders:
   - `h2h` → the page's normal human UI
   - `h2a` → `H2aHome`
   - `a2h` → `A2hHome`
   - `a2a` → the page's agent view (`GxHome` / `GxShop` / `GxOffer`)
2. Use it in `shop.tsx` and `product.$handle.tsx` (replacing the two-way branch) and in `index.tsx` (replacing the inline chain) so the mapping lives in one place.
3. For pages that have no agent view of their own — `moves`, `markets`, `agent-negotiation` — switching to H2A or A2H renders that mode's surface instead of the page body, so the toggle always does something visible everywhere.

No backend, contract or payment changes; this is presentation-layer routing of the mode only.

## Verification

- On the published-equivalent build, load `/shop`, click A2H, confirm the payout inbox appears; repeat on a product page, `/moves` and `/markets`.
- Confirm `?mode=a2h` deep links land on the A2H view on every page.
