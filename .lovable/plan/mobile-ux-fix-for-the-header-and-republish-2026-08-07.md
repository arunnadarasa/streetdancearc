# Mobile UX fix for the header (and republish)

## What's wrong on mobile

At 390px the header packs five things into one row: logo mark, wordmark, the 4-way mode toggle, the hamburger, and the wallet chip. The result in your screenshot:

- the brand name is clipped to "St…"
- the mode pills are ~10px text with tiny tap targets
- the hamburger sits squeezed between two pill groups
- the whole row reads as three competing controls with no hierarchy

Also worth noting: the published site still shows the old A2H behaviour because the A2H fix from the last change hasn't been deployed yet.

## The fix

**Row 1 (mobile) — identity and account only**
- Logo mark + full "StreetRail" wordmark, no truncation (drop the tagline on mobile, keep it from `sm:` up).
- Hamburger and wallet chip on the right, both at a 44px tap target.
- Remove the inline mode toggle from row 1 on mobile.

**Row 2 (mobile only) — mode switcher**
- A full-width sticky strip directly under row 1 with H2H / H2A / A2A / A2H spread evenly across the width, ~12px bold labels and 40px height, active pill filled.
- This keeps one-tap mode switching (it's the demo's main control) while giving it real tap targets instead of cramming it into the logo row.

**Drawer clean-up**
- Keep nav links, Mode and Currency in the sheet, with larger rows and clearer section separation.
- Add the cart entry to the drawer on mobile (currently `extra` is desktop-only).

**Content spacing**
- Reduce the large top gap above the agent/catalog panels on mobile so content starts nearer the header.

Desktop layout is unchanged.

## Then republish

After the layout work, publish so both this and the A2H mode fix are live on streetrail.lovable.app.

## Verification

At 390px: brand not truncated, all four mode buttons reachable and switching content, hamburger opens/closes, wallet chip readable, no horizontal scroll. Checked on `/`, `/shop`, `/moves`, `/agent-negotiation`.
