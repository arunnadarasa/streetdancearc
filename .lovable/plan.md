# Fix Missing Product Images

## Current state
The product detail page renders an empty image placeholder because Shopify products have no images attached. The Storefront API returns `images.edges: []` for every product, so the UI has nothing to display.

## Goal
Attach a generated product image to each Shopify product and ensure it renders on the product detail page and in product cards.

## Plan

1. **Generate product images**
   - Create 7 square lifestyle/product images (1024×1024) matching the existing "Midnight Indigo" premium theme.
   - One image per product: Arc Varsity Baseball Jacket, Crown Bandana, Cypher Cargo Trousers, Krump Kicks Low-Top Sneakers, Ledger Heavyweight Tee, Move Socks (3-Pack), StreetKode Snapback.
   - Save generated files under `src/assets/products/`.

2. **Attach images to Shopify products**
   - Use the `shopify--update_product` tool to upload each image to the matching Shopify product by ID.
   - Provide descriptive alt text for accessibility.

3. **Add a safe fallback in the UI**
   - Update `src/routes/product.$handle.tsx` to show a themed placeholder when `images.edges` is empty, so the layout never collapses even if a product lacks an image.
   - Apply the same fallback to `src/components/shop/ProductCard.tsx`.

4. **Verify**
   - Re-query the Storefront API to confirm `images.edges` is populated.
   - Open the product detail page in the preview to confirm the image renders.

## Out of scope
- Redesigning the product page layout.
- Adding multiple images per product or image galleries.
- Changing pricing, variants, or descriptions.
