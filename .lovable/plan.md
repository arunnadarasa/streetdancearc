# Desktop UX polish

The site was tuned for mobile, and desktop now inherits a few layout problems. Confirmed on 1440px captures of `/`, `/shop` and `/agent-negotiation`.

## What's wrong today

1. **Header wraps onto two rows.** The nav, the cart, the currency toggle, the mode toggle and the sign-in button all stack under the logo instead of sitting on one line — the top bar uses a two-column grid, so the third group is pushed to a second row. This is what the screenshot shows on the Negotiate page.
2. **Heroes waste the screen.** Headline and copy sit in a narrow left column with a large empty right half, and the hero band is tall enough that products and content start well below the fold.
3. **Content rail is narrow for wide screens.** Product grids and the negotiation transcript are capped at 72rem, so 1440px+ monitors get big empty gutters and only 3 products per row.
4. **Negotiate page is single-column.** Buyer goal, transcript and receipt run vertically, forcing scrolling on a screen with plenty of horizontal room.

## What I'll change

**Header (one row on desktop)**
- Switch the desktop bar to a three-track layout: brand left, nav centered, actions right — everything on a single row from `md` up.
- Keep the existing mobile two-row behaviour untouched.
- Slightly tighten pill padding so nav + currency + mode + sign-in fit comfortably at 1280px.

**Heroes**
- Reduce hero vertical padding on desktop so the first row of products / the negotiation panel is visible near the fold.
- Give the hero a two-column desktop layout: copy left, a supporting visual panel right (stat cards on home, drop summary on shop, protocol chips on Negotiate) so the right half is no longer empty.

**Wider rail on large screens**
- Let the rail grow to ~80rem at `xl`, keeping 72rem below that.
- Product grid goes to 4 columns at `xl` (currently 3), with hover lift/detail already in place.

**Negotiate page**
- Two-column desktop layout: goal + controls + transcript on the left, the AP2 mandate / x402 challenge / on-chain receipt panels in a sticky right column, so the receipt stays visible while the transcript scrolls.

**Consistency pass**
- Same treatment applied to `/moves`, `/markets` and the A2H inbox so all four modes match.
- No changes to pricing, FX, settlement or contract logic — presentation only.

## Technical notes

- `src/components/dance/Header.tsx`: replace `grid-cols-[minmax(0,1fr)_auto]` with a `md:grid-cols-[auto_1fr_auto]` track set; mobile row block stays as-is.
- `src/styles.css`: add an `xl` max-width step to the `rail` utility.
- `src/components/layout/Section.tsx` consumers: trim `py-*` at `lg`/`xl`.
- `src/components/gx/AgentNegotiation.tsx`: wrap in `lg:grid lg:grid-cols-[minmax(0,1fr)_380px]` with `lg:sticky lg:top-24` on the right rail.
- `src/components/shop/*`: grid `xl:grid-cols-4`.
- Verify with Playwright captures at 1280px, 1440px and 1920px across all four modes.
