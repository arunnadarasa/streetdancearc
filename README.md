# Dance Move Tokens

A street-dance culture demo built on **Circle's Arc Testnet** (Chain ID `5042002`) combining two things:

1. **On-chain choreography rights registry** — dancers log a move (IPFS CID) and pay a small stablecoin fee that gets stamped on-chain.
2. **Streetwear merch marketplace** — Shopify-powered storefront for sneakers, snapbacks, baseball jackets, trousers, socks, tees, and bandanas repping the culture.

Single-page Spotify-inspired UI. Privy embedded wallet handles auth (Google login) and signing. USDC is the native gas token on Arc; EURC and cirBTC are supported as payment tokens.

---

## Marketplace — Streetwear Swag

The `/shop` route pulls live products from a Shopify development store via the Storefront API. Cart state is persisted in `localStorage` (Zustand) and checkout hands off to Shopify's hosted checkout.

**Catalog (seeded):**

- Sneakers — high-tops built for spins and freezes
- Snapback — flat-brim, embroidered crew logo
- Baseball jacket — satin bomber cut
- Trousers — wide-leg breaker pants
- Socks — crew-length, ribbed
- T-shirt — heavyweight cotton
- Bandana — silk-touch square

**Files:**

- `src/lib/shopify.ts` — Storefront API client + types
- `src/stores/cartStore.ts` — persistent cart (Zustand)
- `src/hooks/useCartSync.ts` — cart line sync
- `src/components/shop/ProductCard.tsx`, `CartDrawer.tsx`
- `src/routes/shop.tsx` — grid
- `src/routes/product.$handle.tsx` — product detail

**Config:** set `VITE_SHOPIFY_DOMAIN` and `VITE_SHOPIFY_STOREFRONT_TOKEN` (already wired for the demo store).

---

## Dance Move Tokens (on-chain)

- **Contract:** `DanceMoveTokens.sol` — `log(address token, uint256 amount, string cid)` emits a `MoveLogged` event after pulling the fee via `transferFrom`.
- **Deployed:** `0x4d13b45f823f8944522890c20d8695b6005465f0` (Arc Testnet, verified on Arcscan).
- **Deploy path:** Circle SCP (`scripts/bootstrap-circle.mjs` → `deploy-arc.mjs` → `verify-arc.mjs`).
- **Compiler:** `solc 0.8.24` pinned (matches Arcscan verifier).

---

## Arc Testnet Token Addresses

Sourced from Circle docs:

| Token  | Address                                      | Decimals | Notes                        |
| ------ | -------------------------------------------- | -------- | ---------------------------- |
| USDC   | `0x3600000000000000000000000000000000000000` | 6        | Native gas token on Arc      |
| EURC   | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6        | Euro Coin                    |
| cirBTC | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | 8        | Circle Wrapped BTC (testnet) |

Testnet tokens have no financial value.

---

## Reference docs

- Circle developer docs: https://developers.circle.com/llms-full.txt
- Arc docs: https://docs.arc.io/llms-full.txt
- Circle agent stack starter kits: https://github.com/circlefin/agent-stack-starter-kits
- cirBTC addresses: https://developers.circle.com/assets/cirbtc-contract-addresses
- EURC addresses: https://developers.circle.com/stablecoins/eurc-contract-addresses
