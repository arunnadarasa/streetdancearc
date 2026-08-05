# Mobile UX pass: GX mode + header

The screenshot shows the GX page on a 384px phone. Three problems are visible:

1. The JSON payload blocks (agent card, payments extension) push wider than the screen, so the whole page scrolls sideways and text runs off the right edge.
2. The header eats a lot of vertical space: brand row plus a second pill row, before any content is visible.
3. The floating cart bubble ("4") sits on top of page content near the bottom.

## What to change

### JSON blocks stop breaking the page
- In `src/components/gx/JsonBlock.tsx`, make the code block contained: add `min-w-0` and `max-w-full`, allow wrapping of long lines (`whitespace-pre-wrap` + `break-all`) so long addresses fold instead of overflowing, and cap tall payloads with a scrollable max height so a single JSON block does not fill the whole screen.
- In `src/components/gx/GxHome.tsx`, add `min-w-0` to the grid children wrapping the two JSON blocks so the grid track cannot be widened by its content.
- Apply the same containment where JSON blocks are rendered in `AgentRunPanel.tsx`, `AgentNegotiation.tsx`, `GxOffer.tsx`, `GxShop.tsx`, and `RunLedger.tsx` if any of those place them in flex/grid parents without `min-w-0`.
- Make the long registry address link wrap cleanly instead of forcing width.

### Slimmer header on phones
- Reduce the mobile nav pill row: smaller vertical padding and tighter gap so the header occupies noticeably less of the first screen.
- Keep the horizontal scroll strip, but let the header collapse the sub-row further once the page is scrolled (same `scrolled` state already tracked).

### Cart bubble no longer covers content
- Add bottom padding to the page shell on mobile so the last section clears the floating bubble, and nudge the bubble in from the edge.

## Technical notes

Root cause of the sideways scroll is CSS grid/flex default `min-width: auto`: a `<pre>` with `overflow-x-auto` still reports its full intrinsic width to the parent track, so the section grows past the viewport. `min-w-0` on the child plus wrapping inside the `<pre>` fixes it at both levels.

No backend, contract, or agent-protocol logic changes — presentation only.

## Verification

Run Playwright at 384px on `/` in GX mode and assert `document.documentElement.scrollWidth === 384`, then screenshot the agent-card section and the header.
