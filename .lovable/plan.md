# Mobile UX pass on the judges deck

On phones the deck frame is locked to a 16:9 widescreen box. At 390px wide that leaves roughly 220px of height, so every slide's content overflows and collides with the slide footer strip — on slide 1 the "USDC gas / EURC + cirBTC / Privy" pills print on top of "Dance Move Tokens · Arc Testnet · 1 / 11". The controls below are also cramped: 11 dots squeezed between Prev and Next.

## What changes

**Slide frame**
- Use a portrait-friendly ratio on phones (roughly 3:4) and keep 16:9 from the small breakpoint up, so slides get real vertical room instead of a letterbox strip.
- Let a slide scroll vertically inside its frame if its content is still taller than the box, with momentum scrolling on touch.

**Slide chrome**
- Hide the bottom "Dance Move Tokens · Arc Testnet · n / 11" strip on mobile (the counter already appears under the deck) and show it from the small breakpoint up. Reclaim the bottom padding slides currently reserve for it.

**Page header**
- Keep the title and action buttons on separate stacked rows on mobile, with the three actions in a single full-width row of equal-weight buttons instead of wrapping unevenly.

**Deck controls**
- Mobile: Prev / "3 of 11" / Next as a single evenly spaced row, dots hidden. Dots return at the small breakpoint and above.
- Larger tap targets for Prev/Next on touch.
- Keep the swipe hint line, shortened on mobile.

**Per-slide density**
- Tighten padding and the largest type scales on the title and stat-heavy slides so their content fits the taller mobile frame without scrolling in most cases.

## Technical notes

- `src/components/deck/Deck.tsx` — responsive aspect ratio via a Tailwind class instead of the inline `aspectRatio` style, scroll container, restructured control row.
- `src/components/deck/slides.tsx` — `Chrome` hidden below `sm`, `Slide` padding adjusted, type scales trimmed on the densest slides.
- `src/routes/deck.tsx` — stacked header/action layout on mobile.
- Verification: Playwright at 390px across several slides, checking no horizontal overflow and no text collision with the footer strip.
