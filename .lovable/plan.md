## Mobile UX issues (from the 393px screenshot + code review)

- Home `Header` cramps "Shop merch →" and "Sign in with Google" next to the title on a single row — buttons collide with the logo/subtitle at mobile widths.
- Shop page header does the same with logo + "← Tokens" + cart trigger.
- Hero `h2` uses `text-4xl` — too large for narrow screens (line breaks awkwardly).
- Product detail page (`product.$handle.tsx`) forces a 2-column grid at mobile-adjacent widths and the image stays 1:1 while pushed alongside long title.
- `MintForm` amount input opens a text keyboard on mobile (missing `inputMode`), buttons and code snippets overflow the card.
- `TreasuryCard` truncates the full address; copy button and the faucet link sit tight against it.
- `CartDrawer` line item row is a 3-column flex on tiny widths — the remove/qty stack pushes price under variant chips.
- `TokenSwitcher` fits fine but has no wrap safety.
- Toaster position is fine (top-center) — leave as is.

## Changes (frontend/presentation only)

1. **`Header.tsx`**
   - Stack vertically on mobile: logo row on top, action row below on `sm:` inline again.
   - Shorten mobile CTA labels: "Shop merch →" → icon + "Shop" on mobile; auth button shows just wallet suffix or "Sign in" on mobile, full label on `sm:`.
   - Reduce logo subtitle to hide on `< sm` (keeps title readable).

2. **Home hero (`routes/index.tsx`)**
   - Hero: `text-3xl sm:text-4xl`, tighten padding `p-6 sm:p-8`, reduce container `py-10` → `py-6 sm:py-10`.
   - Container gap `space-y-8` → `space-y-6 sm:space-y-8`.

3. **Shop header (`routes/shop.tsx`)**
   - Same stacked pattern as Header; hide subtitle on mobile; keep cart drawer trigger visible.
   - Hero heading `text-3xl sm:text-4xl`, tighten padding.

4. **`ProductCard.tsx`**
   - No changes to grid columns (already `grid-cols-2` on mobile — good).
   - Ensure title uses `text-sm sm:text-base` and price row wraps: put price on its own line above the Add button on narrow widths (`flex-col sm:flex-row`).

5. **Product detail (`product.$handle.tsx`)**
   - Grid becomes single column on mobile (already `md:grid-cols-2`, good).
   - Reduce title from `text-3xl` → `text-2xl sm:text-3xl`, price `text-2xl` → `text-xl sm:text-2xl`.
   - Options wrap already OK; ensure sticky "Add to cart" isn't needed — just add safe bottom padding.
   - Enlarge quantity buttons to `h-9 w-9` for tap targets.

6. **`MintForm.tsx`**
   - Amount input: `inputMode="decimal"`, `pattern="[0-9]*\.?[0-9]*"`.
   - CID input: `autoCapitalize="none" autoCorrect="off" spellCheck={false}`.
   - Preview summary: allow the token address `<code>` to break with `break-all`.
   - Submit button `h-12` (larger tap target) and `text-base`.
   - TX link uses `break-all` instead of `truncate` so users can see/copy on mobile.

7. **`TreasuryCard.tsx`**
   - Stack address + Copy vertically on mobile (`flex-col sm:flex-row`) so the full address wraps cleanly (`break-all` on the code).
   - Copy button becomes full-width on mobile.

8. **`CartDrawer.tsx`**
   - Line item: keep flex layout but make the right-side stack (remove + qty) more compact — smaller variant chip text, ensure title uses `truncate` at all widths, price wraps under variant options.
   - Increase qty buttons from `h-6 w-6` to `h-8 w-8` for finger taps (still tight but usable).
   - `SheetContent` on mobile: already `w-full` — fine.

9. **`TokenSwitcher.tsx`**
   - Add `flex-wrap` so 3 pills wrap if needed on very narrow widths.

No business logic changes; no route or data-layer edits. Purely responsive Tailwind class adjustments and a few input attributes for the mobile keyboard.

## Verification

- Switch preview to mobile viewport (390–393px) and confirm:
  - Home header no longer overlaps; hero fits without awkward wraps.
  - Shop grid keeps 2 columns on mobile with legible titles/prices.
  - Product page: title full-width, image on top, options/quantity/CTA stack cleanly.
  - Mint form amount input opens numeric keypad; token address wraps.
  - Cart drawer line items readable without horizontal squash.
- Recheck at `sm:` (≥640px) and desktop to confirm no regressions.