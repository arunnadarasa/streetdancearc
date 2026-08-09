# Update README.md

## Goal
Refresh `README.md` to reflect the latest shipped behavior so judges and visitors see accurate docs on the published site and GitHub repo.

## Changes to make

1. **Mode-independent editorial pages**
   - Add a short note under "Four modes" explaining that `/markets`, `/moves`, `/primer`, `/deck`, and `/judge` are content/reference pages and always render their own content, regardless of the saved GX mode.
   - Document that the mode toggle is hidden on these routes so users are not confused when switching from a mode-driven page to a reference page.

2. **Judge ledger pagination**
   - Update the "Judge demo ledger" section to mention that the ledger paginates at 10 transactions per page with numbered page controls.

3. **Homepage metric rounding**
   - Update the "Live totals & FX transparency" or "Demo UX" section to note that the homepage "USDC settled through the rail" stat is rounded to 2 decimals for readability.

4. **Consistency pass**
   - Ensure the `/markets` route description in the Routes table matches the new mode-independent behavior.
   - Keep all existing sections intact; only append or refine the relevant paragraphs.

## Verification
- Read the updated `README.md` after editing to confirm the new paragraphs are in place and no existing sections were accidentally removed.
