# Remove recent-transactions clutter from the cart drawer

## Goal
Keep the cart drawer focused on checkout. Move the H2H settlement history out of the cart and make it reachable from a single, dedicated surface so the UX is not duplicated or crowded.

## Current state
- `src/components/shop/CartDrawer.tsx` renders `<TxHistoryPanel mode="H2H" limit={3} ... />` inside the checkout footer whenever `settlements.length > 0`.
- The same panel already appears on `/shop` ("Shop settlements") and on `/judge` ("Settlement history").
- The cart drawer also imports `useTxLog` and `TxHistoryPanel` only for this inline list.

## Proposed change
1. Remove the inline `TxHistoryPanel` from `CartDrawer`.
2. Replace it with a compact text link: "Recent settlements →" that navigates to `/judge` (or `/shop#settlements` if preferred), so the history is one click away but not taking up drawer space.
3. Remove the now-unused `useTxLog` and `TxHistoryPanel` imports from `CartDrawer.tsx`.
4. Keep `TxHistoryPanel` itself unchanged; it remains in use on `/shop` and `/judge`.

## Files to edit
- `src/components/shop/CartDrawer.tsx`

## Out of scope
- No changes to `TxHistoryPanel.tsx`, `src/lib/tx-log.ts`, `/shop`, or `/judge`.
- No new routes or database changes.
