# Add the site header to the Judges Deck page

The deck page is the only route left that renders its own standalone title bar instead of the global StreetRail header. That's why there's no logo, no nav, no mode/currency toggles, and no wallet button on that screen.

## What changes

- Render the same sticky global header at the top of `/deck` that every other page uses (logo, Shop / Moves / Negotiate / Markets / Deck nav, currency toggle, H2H·H2A·A2A·A2H mode toggle, sign-in).
- Drop the now-redundant "← Back" pill — the logo and nav already handle navigation.
- Keep the "Judges Deck" title block and the PDF / PPTX download buttons, sitting just under the header.
- On mobile the two download buttons go side by side full width so they stay easy to tap.

## Technical detail

- `src/routes/deck.tsx`: import and render `Header` from `@/components/dance/Header` as the first child, above the `aurora-bg` wrapper (matching `agent-negotiation.tsx`).
- Remove the `Link to="/"` back pill and switch the actions row from `grid-cols-3` to a 2-up grid.
- No changes to `Deck`, slides, or the generated PDF/PPTX artifacts.
