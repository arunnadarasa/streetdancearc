## Goal
On mobile, the header currently truncates the brand to "Dance …" and crams Deck / Shop / Sign in on the same row, leaving no breathing room. Fix the layout so everything is legible and tappable at 375–393px widths.

## Changes (src/components/dance/Header.tsx only)

1. **Two-row layout on mobile, single row from `sm:` up**
   - Wrap header in `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.
   - Row 1: logo + wordmark. Row 2: action buttons (Deck, Shop, Sign in), right-aligned with `justify-end`.

2. **Brand row**
   - Keep the green ♪ badge (10×10).
   - Show full "Dance Move Tokens" title without truncation (it fits once actions move to their own row). Keep the "Arc Testnet · …" subtitle hidden on mobile as today.

3. **Actions row**
   - Deck / Shop / Sign-in stay as pills, `text-xs`, `gap-2`.
   - Shop label stays "Shop →" on mobile (drops " merch").
   - Sign in label stays "Sign in" on mobile (drops " with Google"), or truncated address when authenticated — unchanged behaviour.
   - Ensure buttons don't overflow: `flex-wrap` fallback + `shrink-0` on each pill.

4. No changes to desktop appearance — `sm:` breakpoint preserves the current single-row layout.

## Out of scope
- No changes to routing, auth, or any other component.
- No changes to the Shop page header (separate component).
