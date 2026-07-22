Add a quantity selector to the product detail page (`src/routes/product.$handle.tsx`) so users can choose how many units to add to the cart before clicking "Add to cart".

### Changes (single file: `src/routes/product.$handle.tsx`)

1. Add `const [qty, setQty] = useState(1);` alongside `variantIdx`.
2. Reset qty to `1` whenever `variantIdx` changes (avoid carrying over invalid counts across variants).
3. Above the "Add to cart" button, render a **Quantity** row matching the existing "Options" style:
   - Label: `QUANTITY` (same uppercase/tracking style).
   - Minus button (disabled at 1), numeric readout, Plus button — reusing the same rounded pill/border styling as the options buttons and the CartDrawer stepper (`bg-neutral-900`, `border-neutral-700`, `#1DB954` accent).
4. Pass `quantity: qty` into `addItem(...)` instead of the hardcoded `1`.
5. Update the toast to include the count, e.g. `"${qty} × ${product.title} added to cart"`.

No changes to `cartStore`, `CartDrawer`, or Shopify helpers — `addItem` already accepts an arbitrary quantity and syncs to Shopify via `cartCreate` / `cartLinesAdd`. The existing cart badge on the icon will reflect the new total automatically.