# Fix: navbar blinking

## What's happening

Reproduced on `/shop` at 990px: park the page just after the top and the header flips between two states forever — scroll position bounces 11px / 13px and the header height bounces 124px / 126px, every frame.

Cause is a feedback loop. The header switches to its compact style once `window.scrollY > 12`. Compacting shrinks the header by ~2px, which shifts the page and drops the scroll position back below 12, which expands the header again, which pushes the scroll back over 12. Any scroll position near that threshold sits inside the loop, so the bar blinks.

## The fix

1. Give the state a dead zone instead of a single threshold: switch to compact only after scrolling past ~64px, and back to full only when back under ~24px. A 2px layout shift can then never cross a boundary.
2. Stop the header from changing its own height as the trigger. Keep the header's vertical padding and logo size fixed and let the scrolled state change only non-layout properties (background, blur, border, shadow), so the compact state cannot move the page at all.

Together these remove the loop at the source rather than damping it.

## Technical detail

- `src/components/dance/Header.tsx`: replace the `window.scrollY > 12` toggle with hysteresis thresholds, and drop the `scrolled`-conditional `py-*` / logo `h-*`/`w-*` swaps so only the visual treatment changes. The tagline hide-on-scroll also changes height — keep it visible (or reserve its space) at desktop widths.
- Verify with the same Playwright loop: sample 40 frames while parked near the threshold and confirm scrollY and header height stay constant, at several widths (390 / 990 / 1440).
