# Fix: /markets shows the A2H view on the published site

## What's happening

This is not a publish/build difference — it's the saved interface mode.

The mode (H2H / H2A / A2A / A2H) is stored in the browser's local storage and reused
on every page. In the published tab the mode was left on **A2H**, so `/markets`
rendered the A2H payout inbox instead of the market-opportunity page. In the preview
tab the mode was **H2H**, so the correct page appeared. Same code, different saved mode.

Confirmed in the code: `src/lib/gx-mode.ts` persists the mode globally, and
`src/routes/markets.tsx` wraps its whole body in `ModeSurface` with no agent view of
its own, so anything other than H2H replaces the page with a generic mode surface.

## The fix

Treat editorial/reference pages as mode-independent. They are content, not a commerce
surface, so the toggle should not blank them out.

1. Remove the `ModeSurface` wrapper from `src/routes/markets.tsx` — the market
   opportunity content always renders, whatever mode is selected.
2. Do the same for `src/routes/moves.tsx`, which likewise has no agent view and today
   gets replaced by a generic surface.
3. Hide the mode toggle on those pages (header + mobile drawer) so the control only
   appears where it actually changes something: home, shop, product, market and
   negotiate.

Pages that genuinely have per-mode views (home, shop, product, agent negotiation)
keep their current behaviour.

## Technical details

- `markets.tsx` / `moves.tsx`: drop `ModeSurface` + `useGxMode`, render the page body
  directly inside the existing layout.
- Header/`MobileDrawer`: derive a `showModeToggle` flag from the current route
  (`useRouterState` pathname) and skip rendering `ModeToggle` on `/markets`, `/moves`,
  `/primer`, `/deck`, `/judge`.
- No backend, contract, or payment changes; presentation only.

## Verification

- With `?mode=a2h` in the URL, load `/markets` and confirm the market page renders.
- Confirm home/shop/product/negotiate still switch views per mode.
- Republish and re-check the published URL.
