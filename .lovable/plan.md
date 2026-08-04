# Merch product imagery

Right now every product card falls back to a grey bag icon because the Shopify products have no images. This adds real generated product shots for all 7 pieces in the drop.

## Look and feel

One consistent art direction so the grid reads like a single drop, matching the Midnight Indigo theme:

- Studio product shot on a deep near-black indigo backdrop
- Soft violet rim light, subtle floor reflection, slight film grain
- Square 1:1 framing, product centred, generous margin
- No text, no logos, no people

## What gets an image

1. Krump Kicks Low sneakers
2. StreetKode Snapback
3. Baseball jacket
4. Trousers / cargos
5. Crew socks
6. Tee
7. Bandana

## How it works

- Generate one 1024x1024 image per product.
- Register each file as a hosted asset so it has a stable public URL.
- Attach those URLs to the matching Shopify products so images come from the real catalogue — the storefront, cart drawer, product page and the GX/x402 agent catalogue all pick them up with no extra frontend code.
- Keep the existing bag-icon fallback for any product without an image.

## Notes

Attaching images updates the connected Shopify store's product data (the dev store), not just the Lovable UI.
