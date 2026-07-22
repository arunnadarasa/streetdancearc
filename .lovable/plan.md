## Why the product shows "Sold out"

The Add-to-cart button checks `variant.availableForSale` from Shopify. Every seeded variant currently has 0 tracked inventory, so Shopify returns `availableForSale: false` and the storefront renders "Sold out".

## Plan: stock each variant

1. List all 7 seeded products via `shopify--list_products` to collect product IDs and variant IDs.
2. For each variant, call `shopify--update_product_variant` with:
   - `inventory_management: "shopify"` (track stock)
   - `inventory_policy: "deny"` (real e-commerce behaviour once stock runs out)
   - Stock quantity: **50 units per variant** (set via the inventory adjustment path the tool exposes; if the update tool cannot set quantity directly, fall back to `inventory_policy: "continue"` as a demo safeguard so nothing goes sold out mid-demo).
3. Verify by reloading `/product/krump-kicks-low-top-sneakers` — the button should switch from "Sold out" to "Add to cart".

No frontend code changes are needed; the storefront already reacts to `availableForSale` from Shopify.

## Note

Shopify's REST variant update endpoint does not set on-hand quantity directly (that requires the Inventory Levels API, which isn't exposed as a tool here). If the quantity can't be set through the available tools, I'll flip `inventory_policy` to `continue` on each variant so the demo store stays buyable — I'll confirm which path worked after running it.