## Goal
Replace the PDF `<object>` embed on `/deck` with an interactive React slide deck that renders the 10 judges' slides inline, is keyboard/tap navigable, and works on both mobile and desktop.

## Approach

Keep `/deck` as the single route. Reuse the existing route header (title, Back, Open PDF ↗, Download PDF, Download PPTX buttons — kept as a fallback/handoff). Replace the PDF viewer block with an interactive `<Deck />` component.

### New files
- `src/components/deck/slides.tsx` — array of 10 slide React components with content extracted from the existing PPTX (title/hero, problem, insight, what we built, live on arc, agentic economy flow, defi, criteria mapping, roadmap, closing). Each is a self-contained JSX block styled with the site's Spotify-dark palette (`bg-black`, `#1DB954` accents, `#E63946` cherry for problem highlights, neutral borders) — matches the current `/` and `/shop` look.
- `src/components/deck/Deck.tsx` — client component that:
  - Renders one slide at a time inside a 16:9 aspect-ratio frame (`aspect-video`) that scales to container width, so it works from 375px up.
  - Prev/Next pill buttons, slide counter "N / 10", and a thin progress bar.
  - Keyboard: ←/→/Space/Home/End. Touch: swipe left/right (basic pointer-based, no dep).
  - Small dot indicators under the frame (tap to jump).
  - No full-screen scaling engine (no 1920×1080 transform system) — content is authored responsively with Tailwind so it reads well at any width. This keeps scope tight and avoids the slides-app scaffolding.

### Edits
- `src/routes/deck.tsx` — replace the `<object>` block with `<Deck />`. Keep the download/open-PDF buttons as secondary actions (relabel "Open PDF ↗" → "PDF version ↗" to signal the interactive deck is primary).

### Out of scope
- No URL-driven slide index, no presenter view, no fullscreen API, no thumbnail grid, no notes panel, no print mode.
- No PPTX regeneration; existing files stay in `public/` as downloads.
- No changes to home, shop, or product routes.

## Technical notes
- Pure React state (`useState` for current index). No new dependencies.
- Slides authored at any viewport — use `text-2xl sm:text-4xl md:text-6xl` scales, `grid`/`flex` layouts, and `min-h-0` where needed to prevent overflow.
- Frame uses `aspect-[16/9]` with `overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950` to match the current card treatment.
