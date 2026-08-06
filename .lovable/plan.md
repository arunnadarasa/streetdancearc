# Update Encode Club hackathon URL

Replace the old `programmable-money-hackathon` link with the user-supplied Arc hackathon URL (`https://www.encodeclub.com/programmes/arc-hackathon`) across the project, using the anchor text **"Programmable Money Hackathon"** and opening in a new tab.

## Files to change

1. **`src/components/layout/SiteFooter.tsx`**
   - Update the `href` on the existing "Programmable Money Hackathon" link.
   - Keep `target="_blank"` and `rel="noopener noreferrer"`.

2. **`README.md`**
   - Turn the plain-text attribution line into a linked reference:
     `Built for the Encode Club [Programmable Money Hackathon](https://www.encodeclub.com/programmes/arc-hackathon) — Build on Arc ...`

3. **`src/components/deck/slides.tsx`**
   - Wrap the title-slide kicker "Encode Club · Programmable Money Hackathon · Build on Arc" in a link to the new URL, opened in a new tab.

4. **`/mnt/documents/StreetRail-Submission-Copy.md`**
   - Add a "Hackathon URL" field under the quick-reference table.

## Verification

- Run a search for the old URL to confirm zero remaining references.
- Run a search for the new URL to confirm all four locations point to it.
- Build the app to ensure no JSX/markdown syntax errors.
