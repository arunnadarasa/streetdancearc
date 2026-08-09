# Add pagination to the judge settlement history

## What we are changing
The `/judge` settlement history currently renders every transaction in one long list. We will paginate it so only 10 transactions show per page, with Previous / Next controls and clickable page numbers when there are more than 10 entries.

## Why
During a busy demo the list grows quickly; pagination keeps the page scannable and prevents the primary actions from being pushed far below the fold.

## Implementation
1. In `src/components/dance/TxHistoryPanel.tsx`:
   - Add local state for `page` (default 1) and a constant `PAGE_SIZE = 10`.
   - Slice the filtered `entries` into the current page before rendering.
   - Add a pagination bar below the list showing:
     - Previous / Next buttons (disabled at boundaries)
     - Page numbers (e.g. 1 2 3 … last) when total pages > 1
     - A small text summary like "Showing 1–10 of 24"
   - Reset `page` to 1 when the `mode` prop or `entries.length` changes in a way that would leave the current page empty.
2. Keep the existing `limit` prop working for callers that want a capped list without pagination (e.g. compact surfaces). When `limit` is provided, use it as before and do not render pagination.
3. Verify `/judge` still loads and the pagination controls work, and run a typecheck.

## Files touched
- `src/components/dance/TxHistoryPanel.tsx`
