# Fix: mobile page zooms out to "desktop" after Preview metadata & CID

## What you're seeing

On your phone, tapping **Preview metadata & CID** makes the whole page shrink to a tiny desktop-looking layout. That is Chrome on Android zooming out because, at that moment, something on the page becomes wider than the screen. The layout itself is still the mobile one — it is just scaled down to fit the over-wide content.

## What the debugging showed

Reproduced the flow in a 390px-wide browser (attach clip, pin it, then preview): the page did **not** overflow in that emulated run, so the blowout is triggered by content only your real run produces — a long, unbroken string (the 16 MB clip's gateway URL and metadata lines) inside the JSON preview block plus the pinned-CID block. Two things make the app fragile here:

- The JSON preview uses a horizontally scrollable `<pre>`. If any ancestor in that column cannot shrink, the scroller stops clamping and pushes the page wide instead.
- There is no global guard: `html`/`body` in `src/styles.css` have no `overflow-x` / max-width rule, so any single over-wide node re-scales the whole page.

## The fix

1. **Global guard** (`src/styles.css`): add `overflow-x: clip` and `max-width: 100%` on `html, body` in the base layer, so no single element can ever rescale the page on mobile.
2. **Wrap instead of scroll** (`src/components/dance/MetadataPreview.tsx`): render the metadata JSON with wrapping (`whitespace-pre-wrap` + `break-all`) on mobile rather than a horizontal scroller, keeping the capped height and scroll for tall content. Remove the now-unneeded "Swipe the block above" hint. This removes the class of bug entirely instead of patching one string.
3. **Shrink-safe chain**: add `min-w-0` / `max-w-full` to the wrappers between the mint card and the preview block in `MintForm.tsx` and the pinned-clip panel in `ClipPreview.tsx` (the pinned `ipfs://` link and content hash already break, their flex parents need to be allowed to shrink).
4. **Verify** with a Playwright run at 390px and 412px through the full path (choose file → pin → preview), asserting `documentElement.scrollWidth === innerWidth` at every step, plus a screenshot after preview.

## Notes

Frontend/CSS only — no changes to pinning, CID computation, or on-chain logic.
