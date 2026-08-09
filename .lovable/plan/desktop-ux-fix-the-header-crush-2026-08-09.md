# Desktop UX: fix the header crush

Your screenshot shows the real problem: at desktop width the top bar is holding eight nav links, a cart button, three currency pills, four mode pills and the sign-in button on one line. The cart icon is sitting on top of the "Deck" link (visible as a clipped "ck"), and the sign-in button reads "Sign inwith Google" because the label has no room to breathe.

## What's wrong

1. **Header overflow.** Nav (Shop / Moves / Market / Negotiate / Markets / Primer / Judge run / Deck) plus three control groups cannot fit; items overlap instead of wrapping.
2. **Redundant nav.** "Market" and "Markets" sit next to each other and read as duplicates; "Primer", "Judge run" and "Deck" are supporting pages competing with the primary shopping path.
3. **Control noise.** Currency (3 pills) and mode (4 pills) take as much horizontal room as the whole nav, though they're used rarely compared to navigation.
4. **Hero balance.** Below the header the layout is fine, but the hero band eats a full viewport before any product appears.

## What I'll change

**Header (primary fix)**
- Keep only the core links inline: Shop, Moves, Market, Negotiate.
- Move Markets, Primer, Judge run and Deck into a single "More" dropdown at the end of the nav, so the row never overflows.
- Collapse the currency selector into a compact dropdown showing the active token (e.g. "USDC ▾") with the three options inside; the full three-pill strip stays on very wide screens (`2xl`).
- Keep the four-mode toggle inline but tighten pill padding, and give the cart button a fixed slot with proper spacing so it can never overlap a nav link.
- Fix the sign-in label spacing ("Sign in with Google").
- Add a min-width guard so from `md` to `xl` the row degrades gracefully (nav shrinks first, then labels) rather than colliding.

**Hero**
- Trim desktop hero min-height so the first content section peeks above the fold, keeping the existing two-column copy + live-metrics layout.

**Consistency**
- Apply the same header behaviour on every route (it is one shared component), and re-check `/shop`, `/market`, `/agent-negotiation` and `/judge` at 1280, 1440 and 1920px.

## Technical notes

- `src/components/dance/Header.tsx`: split `NAV` into `PRIMARY_NAV` and `MORE_NAV`; render the latter in a shadcn `DropdownMenu`. Keep the existing `md:grid-cols-[auto_minmax(0,1fr)_auto]` tracks, add `min-w-0` on the nav track and `shrink-0` on the actions track.
- `src/components/gx/PayTokenToggle.tsx`: add a `compact` variant (dropdown) used by the header below `2xl`; existing pill markup kept for wide screens and mobile drawer.
- `src/components/gx/ModeToggle.tsx`: reduce `lg` padding only — no behaviour change.
- `src/routes/index.tsx`: reduce `lg:min-h-[calc(100svh-6rem)]` to roughly `88svh`.
- Presentation only — no changes to wallet, FX, contracts or settlement logic. Verified with Playwright captures at three desktop widths.
