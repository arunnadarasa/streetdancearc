# Mobile burger menu — review and fix

Reviewed live at 390px. It works and nothing is broken, but the drawer is currently a plain link list with three unlabelled control blocks, and roughly the bottom 40% of the panel is empty.

## What's wrong today

1. **No Home entry.** The nav list is Shop / Moves / Negotiate / Markets / Deck. On the landing page nothing is highlighted, so there is no way back to home from the drawer.
2. **Mode toggle is duplicated.** The four-mode strip is already pinned under the header on every mobile screen, and the same toggle appears again inside the drawer.
3. **No wallet in the drawer.** Sign-in, address and the USDC / EURC / cirBTC balances only live in the header chip. The drawer is where a phone user expects account state.
4. **Currency toggle has no balances.** In the drawer the pills show ticker only, so picking a token is a blind choice.
5. **Cart is an unlabelled icon** under a "CART" caption, with no item count or "View cart" affordance.
6. **Dead space.** Content stops around 60% height; no footer links to the repo, the two verified contracts, or the Arcscan explorer.
7. **Rows are flat.** No icons, no chevrons, no subtitles — a phone user has to read every label to find anything.

## What to change

**Nav section**
- Add Home as the first row; highlight it when the path is exactly `/`.
- Give each row an icon, the label, and a one-line subtitle (e.g. Negotiate — "watch two agents settle"), with a chevron on the right. Keep rows at 56px minimum.

**Wallet section (new, directly under the header of the drawer)**
- Signed out: full-width "Sign in with Google" button.
- Signed in: truncated address, copy button, and the three balances (USDC / EURC / cirBTC) with their USD equivalents, reusing the existing balances hook.

**Controls**
- Drop the duplicated Mode block from the drawer — the pinned strip already covers it.
- Keep Currency, but show each token's balance under the ticker so the choice is informed.
- Turn Cart into a full-width row: cart icon, "Cart", item count badge, chevron.

**Footer of the drawer**
- Small link list: GitHub repo, DanceMoveTokens on Arcscan, StreetRailAuthorizer on Arcscan, plus a "Arc Testnet · chain 5042002" caption.

## Technical notes

- All changes are contained in `src/components/dance/Header.tsx` plus one new `src/components/dance/MobileDrawer.tsx` to keep the header readable.
- Reuse `use-arc-balances.ts` and `BalancePanel`'s formatting helpers rather than duplicating balance logic; no new server functions or data fetching.
- Make `SheetContent` a flex column with the nav area scrollable so the footer links stay reachable on short phones.
- Verify at 390px and 320px with Playwright after the change.
