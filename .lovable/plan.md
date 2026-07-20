
## Goal

Extend the current single-page Dance Move Tokens demo with a Shopify-powered e-commerce layer for physical street dance merch (sneakers, snapbacks, baseball jackets, trousers, socks, tees, bandanas), using a new Shopify development store as the catalog + checkout backend.

## Approach

1. **Enable Shopify (new development store)** via `shopify--enable` with `store_type: "new"`. This provisions a free dev store; user can claim within 30 days to keep it and start Shopify's 120-day post-claim trial.
2. **Offer claim** immediately after creation via `shopify--claim_store` (user can skip).
3. **Follow the enabled Shopify knowledge** (only becomes available after enable) to wire product catalog, cart, and Shopify Checkout into the app.

## What ships in the app

- New route `/shop` with a Spotify-dark, street-dance themed storefront (product grid, product detail, cart drawer, Shopify checkout handoff).
- Header gets a "Shop" link next to the existing Dance Move Tokens demo — both coexist on the same single-page app shell.
- Seed catalog of street dance merch categories: Sneakers, Snapbacks, Baseball Jackets, Trousers, Socks, Tees, Bandanas.
- Product data lives in Shopify (source of truth). We create the categories/products via Shopify tools after enable.

## What stays untouched

- Existing `DanceMoveTokens.sol`, Arc chain config, Privy wallet, Circle SCP bootstrap — untouched. The merch store is a parallel feature, not a replacement.

## Order of operations (single next message)

1. Call `shopify--enable` with `store_type: "new"`.
2. On success, call `shopify--claim_store` so you can claim or skip.
3. Then follow the newly-surfaced Shopify knowledge to build the `/shop` route, seed products, and wire checkout.

## Cost / setup notes

- Development store is free to build on.
- To keep the store, claim it within 30 days (Shopify removes unclaimed dev stores after 30 days).
- Claiming starts a separate 120-day free trial on a Shopify subscription; a paid plan is only needed once that trial ends and you're ready to actually sell.
- For current plan options and pricing, see Shopify's official pricing page.
