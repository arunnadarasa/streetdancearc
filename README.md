# StreetRail

Streetwear commerce on **Circle's Arc Testnet** (chain id `5042002`) — a shop that humans can browse and agents can buy from, settled in stablecoins on the same rail.

Live demo: https://streetrail.lovable.app  
Source: https://github.com/arunnadarasa/streetdancearc

Merch is the product. The on-chain move registry is the culture layer underneath it: dancers stamp a choreography CID on-chain and the drop it belongs to inherits that provenance. USDC is the native gas token on Arc; EURC and cirBTC are supported as payment tokens.

---

## Four modes

The same catalog, the same settlement rail, four interfaces. A global toggle in the header switches between them and the choice rides along in the `?mode=` query param across routes (legacy `?mode=gx` maps to A2A).

| Mode           | Who drives      | What happens                                                                                                 |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `H2H` · UX     | Human           | Classic storefront: browse merch, add to cart, checkout. Move registry available as a secondary surface.       |
| `H2A` · GX     | Human → agent   | You state intent and a spend policy; the agent shops, pauses on interrupts, and logs every step to an audit ledger. |
| `A2A` · x402   | Agent → agent   | No UI in the loop: agent-card discovery, UCP/AP2 mandates, AIsa negotiation, then `402 Payment Required` → settle → receipt. |
| `A2H` · inbox  | Agent → human   | The agent initiates. The Rights Agent pushes royalty payouts in USDC, requests approval when a payout breaks the standing AP2 mandate, and drops an Arcscan receipt in a payout inbox. |

**Agent surface** (all under `src/routes/api/public/`, callable by external agents):

- `agent-card.ts` — A2A 0.3 agent card / capability discovery
- `catalog.ts` — machine-readable product catalog
- `purchase.ts` — x402 challenge, settlement, and signed receipt
- `a2a/`, `ap2/`, `ucp/` — protocol endpoints for tasks, mandates, and commerce intents

**Client components:** `src/components/gx/` (A2A run panel, negotiation, spend policy, ledger, mode toggle), `src/components/h2a/H2aHome.tsx` and `src/components/a2h/` (payout inbox, standing mandate panel).

---

## Marketplace — streetwear swag

`/shop` pulls live products from a Shopify development store via the Storefront API. Cart state persists in `localStorage` (Zustand) and checkout hands off to Shopify's hosted checkout. Product imagery is custom-generated art matching the app's Midnight Indigo theme, with gradient placeholders as fallback.

**Catalog (seeded):** sneakers, snapback, baseball jacket, trousers, socks, t-shirt, bandana.

**Files:**

- `src/lib/shopify.ts` — Storefront API client + types
- `src/stores/cartStore.ts` — persistent cart (Zustand)
- `src/hooks/useCartSync.ts` — cart line sync
- `src/components/shop/ProductCard.tsx`, `CartDrawer.tsx`, `FeaturedMerch.tsx`
- `src/routes/shop.tsx` — grid; `src/routes/product.$handle.tsx` — detail with quantity stepper

---

## On-chain

- **Contract:** `contracts/DanceMoveTokens.sol` — `log(address token, uint256 amount, string cid)` emits `MoveLogged` after pulling the fee via `transferFrom`.
- **Deployed:** [`0x4d13b45f823f8944522890c20d8695b6005465f0`](https://testnet.arcscan.io/address/0x4d13b45f823f8944522890c20d8695b6005465f0) — verified on Arcscan.
- **Deploy path:** Circle Smart Contract Platform, via the scripts below.
- **Compiler:** `solc 0.8.24`, pinned to match the Arcscan verifier.

---

## Arc network config

- Chain id `5042002`, USDC as the native gas token with **6 decimals** (not 18 — this trips up most tooling).
- Explorer: Arcscan testnet.
- **RPC:** the browser never talks to the provider directly. Client calls go to the same-origin `/api/public/arc-rpc` route, which forwards JSON-RPC to the upstream URL held in the `ARC_RPC_URL` secret (an Alchemy Arc endpoint), so the provider key never ships to the client. When `ARC_RPC_URL` is unset, the public Arc testnet RPC is used.

| Token  | Address                                      | Decimals | Notes                        |
| ------ | -------------------------------------------- | -------- | ---------------------------- |
| USDC   | `0x3600000000000000000000000000000000000000` | 6        | Native gas token on Arc      |
| EURC   | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6        | Euro Coin                    |
| cirBTC | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | 8        | Circle Wrapped BTC (testnet) |

Testnet tokens have no financial value.

---

## Routes

| Route                | What it is                                                        |
| -------------------- | ----------------------------------------------------------------- |
| `/`                  | Home — featured merch, mode toggle, move registry below the fold   |
| `/shop`              | Full catalog grid                                                  |
| `/product/$handle`   | Product detail, quantity stepper, add to cart                      |
| `/moves`             | On-chain move registry (log a CID, pay the stablecoin fee)         |
| `/agent-negotiation` | AIsa-powered buyer/seller negotiation transcript                   |
| `/markets`           | FX-volatility research — why stablecoin rails matter in NGN/ARS/PHP markets |
| `/deck`              | Interactive judges' slide deck (native React, mobile-friendly)     |

---

## Local setup

```bash
npm install
npm run dev
```

Configuration lives in project secrets, not a committed `.env`. Names only:

| Name                             | Used for                                   |
| -------------------------------- | ------------------------------------------ |
| `PRIVY_APP_ID`                   | Google login + embedded wallet             |
| `ARC_RPC_URL`                    | Upstream Arc RPC behind the proxy route    |
| `CIRCLE_API_KEY`                 | Circle SCP / wallets                       |
| `CIRCLE_ENTITY_SECRET`           | Circle entity secret (write-only)          |
| `CIRCLE_TREASURY_WALLET_ID`      | Deployer / treasury wallet                 |
| `CIRCLE_TREASURY_ADDRESS`        | Treasury address surfaced in the UI        |
| `AISA_API_KEY`                   | AIsa agent reasoning and negotiation       |
| `VITE_SHOPIFY_DOMAIN`            | Shopify store domain                       |
| `VITE_SHOPIFY_STOREFRONT_TOKEN`  | Shopify Storefront API token               |

---

## Scripts

| Script                        | What it does                                                              |
| ----------------------------- | ------------------------------------------------------------------------- |
| `scripts/bootstrap-circle.mjs` | Generates/registers the entity secret and provisions the treasury wallet   |
| `scripts/deploy-arc.mjs`       | Compiles with `solc 0.8.24` and deploys to Arc Testnet via Circle SCP      |
| `scripts/verify-arc.mjs`       | Submits source to the Arcscan (Blockscout) REST verify endpoint            |

---

## Reference docs

- Circle developer docs: https://developers.circle.com/llms-full.txt
- Arc docs: https://docs.arc.io/llms-full.txt
- Circle agent stack starter kits: https://github.com/circlefin/agent-stack-starter-kits
- Arc nanopayments: https://github.com/circlefin/arc-nanopayments
- cirBTC addresses: https://developers.circle.com/assets/cirbtc-contract-addresses
- EURC addresses: https://developers.circle.com/stablecoins/eurc-contract-addresses
- x402 payment protocol: https://x402.org
- AP2 agent payments protocol: https://ap2-protocol.org
- A2A protocol: https://a2a-protocol.org
- AIsa docs: https://aisa.one/docs/llms-full.txt
