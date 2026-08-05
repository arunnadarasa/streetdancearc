# Plan: Add GitHub repo URL to the StreetRail site

## Goal
Surface the public repository `https://github.com/arunnadarasa/streetdancearc` on the StreetRail site and in the submission copy.

## Where to add it
1. **SiteFooter** — add a "GitHub" text link next to the existing footer links (Shop / Markets / Deck / Agent card). Keeps the link persistent across every page.
2. **Deck closing slide** — update Slide 13 (`SlideClose`) to show both the live demo URL and the GitHub repo URL, and refresh the demo URL to `streetrail.lovable.app` if it still says the old `streetdancearc` slug.
3. **README.md** — add the repo URL near the top of the README so visitors from the published site or judges land on the code.
4. **Submission copy doc** — replace the `[YOUR_GITHUB_REPO_URL_HERE]` placeholder with the actual URL.

## Out of scope
- No new routes, no auth changes, no backend work.
- No visual redesign beyond the footer link addition and the closing-slide text update.

## Verification
- Run the dev build/typecheck to confirm no JSX errors.
- Spot-check the footer and deck closing slide in the preview at mobile width.
