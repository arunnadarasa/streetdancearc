# Mobile UX polish

From the phone screenshot: the header eats ~30% of the first screen, the brand name truncates to "Dance Move T…", and the hero headline is so large it pushes the buttons below the fold.

## What changes

### Header (mobile only)
- Shrink the logo tile and brand type so "Dance Move Tokens" fits on one line without truncating; keep the subtitle hidden on small screens.
- Reduce vertical padding on the top row and the nav chip row so the whole header is noticeably shorter.
- Keep the H2H/GX toggle and Sign in button, but make them compact (smaller pills, tighter gap) so all three items sit comfortably on a 360px-wide screen.
- Keep the scrollable nav chip row (Shop / Negotiate / Markets / Deck) with a soft fade at the right edge to hint at scrolling.

### Hero (H2H home)
- Replace the `13vw` headline with a clamped size that stays readable but no longer dominates the screen; tighter top/bottom padding and a shorter minimum height so the CTAs are visible without scrolling.
- Make "Register a move" and "Shop the merch" full-width stacked buttons on mobile, side by side from `sm:` up.
- Tighten the stats grid spacing on small screens.

### Sweep of other pages
- Check shop, product, markets, deck, and GX home for the same issues: oversized headings, horizontal overflow, and touch targets under 44px; apply the same responsive rules (`min-w-0`, `truncate`, `shrink-0`, grid-then-flex header rows).

## Technical notes
- Files: `src/components/dance/Header.tsx`, `src/routes/index.tsx`, plus targeted spacing fixes in `src/routes/shop.tsx`, `src/routes/product.$handle.tsx`, `src/routes/markets.tsx`, `src/routes/deck.tsx`, `src/components/gx/GxHome.tsx`.
- Presentation-only: no changes to Privy auth, Arc chain config, contract calls, Shopify data, or the agent/GX logic.
- Verified with a 390px-wide headless browser pass across all routes.
