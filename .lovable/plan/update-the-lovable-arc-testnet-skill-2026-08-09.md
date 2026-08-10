# Update the Lovable · Arc Testnet skill

## Goal
Codify the latest shipping lessons into the `lovable-arc` skill so future Arc builds on Lovable inherit the fixes we just landed.

## Changes to make

1. **Read the current skill files**
   - `.workspace/skills/lovable-arc/SKILL.md` (active)
   - `.agents/skills/lovable-arc/SKILL.md` (draft)
   Confirm the current hard-rule numbering and section layout before editing.

2. **Add new hard rules**
   - **#16 — Mode-independent editorial pages.** Reference/content routes (`/markets`, `/moves`, `/primer`, `/deck`, `/judge`) must never be wrapped in a per-mode surface. They always render their own content and the mode toggle is hidden on them so a persisted GX mode does not swap the page unexpectedly.
   - **#17 — Paginate long settlement/activity lists.** Judge ledgers, receipt panels, and marketplace activity lists should paginate at ~10 items with numbered controls. Long scrollable lists push primary actions below the fold and break demo pacing.
   - **#18 — Round hero stats to 2 decimals.** Marketing/hero metrics (e.g., "USDC settled through the rail") should render with 2-decimal precision, not raw contract precision, for readable social proof.

3. **Update supporting sections**
   - Under **What worked well**, add the mode-independent page split and the compact "Recent settlements →" link pattern that keeps the cart drawer focused on checkout.
   - Under **What I'd do differently next time**, add: decide which routes are mode-driven vs. mode-independent before wiring the global toggle, and build pagination into the first settlement/activity panel rather than retrofitting it.

4. **Apply the updated skill**
   - Write the changes to `.agents/skills/lovable-arc/SKILL.md`.
   - Call `skills--apply_draft` with path `.agents/skills/lovable-arc` to activate the updated version.

## Verification
- Read the updated `.agents/skills/lovable-arc/SKILL.md` to confirm the new rules and edits are in place.
- Confirm the apply_draft result reports success.
