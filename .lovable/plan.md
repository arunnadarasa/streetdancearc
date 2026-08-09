# Improve tablet UX

At tablet widths the header breaks: at 768px the nav links overlap the StreetRail wordmark and the cart/contracts buttons; at 1024px "More" overlaps the "Contracts" button. Everything is forced into one row too early, so items collide instead of wrapping.

## What changes

**Header (main fix)**
- Keep the compact, mobile-style header (logo + burger + wallet) all the way up to 1024px instead of switching to the full desktop bar at 768px. Tablets get the drawer, which already holds every link, the mode toggle and the contract links.
- From 1024px up, show the full bar but with breathing room: primary nav links, "More" dropdown, Contracts and the currency toggle only appear when there is real space, and each element is prevented from overlapping its neighbours.
- Show the mode toggle (H2H / H2A / A2A / A2H) as the full-width row under the header on tablet too, so mode switching stays one tap away without crowding the top row.
- Give the tablet header the same larger tap targets already used on mobile.

**Tablet page polish**
- Market page: the "List a move" and "Transfer a move" cards sit side by side from 768px and feel cramped; stack them until 1024px so fields and buttons get full width.
- Filter/segment rows (market activity filters, currency pills) wrap cleanly instead of squeezing.
- Sweep the main routes (home, shop, moves, market, judge, primer) at 768 / 834 / 1024 / 1180 and fix any element that clips or overflows.

## Technical notes

- `src/components/dance/Header.tsx`: move the desktop breakpoints from `md:` to `lg:` for the nav, Contracts button, PayToken toggle and ModeToggle; burger stays visible below `lg`. Add `min-w-0` to the nav column and `shrink-0` on action buttons; drop the trailing mode-toggle row's `md:hidden` to `lg:hidden`.
- `src/components/dance/QuickContractLinks.tsx`: gate to `xl` and up (already) — verify it doesn't reappear in the tablet band.
- Market page grid: `md:grid-cols-2` → `lg:grid-cols-2` for the list/transfer panels.
- Verify with Playwright element screenshots of the header at 768, 834, 1024 and 1180 plus a scrollWidth overflow assertion per route.

No backend, contract, or business-logic changes.
