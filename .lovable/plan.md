# Regenerate the downloadable PDF and PPTX from the current deck

## What's out of date

`public/judges-deck.pdf` and `public/judges-deck.pptx` were generated before the deck grew to its current 13 slides (H2H/H2A/A2A interfaces, protocol stack, markets, GitHub link, StreetRail rebrand). The in-app interactive deck is correct; the two downloads are stale.

## Approach

Regenerate both files directly from the live interactive deck so they match pixel-for-pixel and stay on-brand.

1. **Capture** — Playwright script against the running preview `/deck` route: set a 1600×900 desktop viewport, step through all 13 slides, and take an element screenshot of the slide surface for each.
2. **PDF** — assemble the 13 captures into a single landscape 16:9 PDF, one slide per page, no margins.
3. **PPTX** — build a 13-slide 16:9 deck with pptxgenjs, each slide a full-bleed embedded base64 image of the corresponding capture.
4. **Publish** — overwrite `public/judges-deck.pdf` and `public/judges-deck.pptx` (the deck page's existing PDF/PPTX buttons keep working unchanged), and also write copies to `/mnt/documents` as `StreetRail-JudgesDeck.pdf` / `.pptx` for direct download.

## Verification

Convert every page of the new PDF and every slide of the new PPTX back to images and inspect all 13 for clipped text, blank pages, wrong ordering, or missing brand colors, then re-run the generator if anything is off. Confirm the deck page's PDF and PPTX buttons serve the new files.

## Notes

No changes to the interactive deck's slide content or `src/routes/deck.tsx` — this only refreshes the exported artifacts.
