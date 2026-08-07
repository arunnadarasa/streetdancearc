# StreetRail

Streetwear commerce on **Circle's Arc Testnet** (chain id `5042002`) — a shop that humans can browse and agents can buy from, settled in stablecoins on the same rail.

Built for the Encode Club [**Programmable Money Hackathon**](https://www.encodeclub.com/programmes/arc-hackathon) — Build on Arc (Agentic Economy track, final submissions 9 August 2026).

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
| `A2H` · inbox  | Agent → human   | The agent initiates. The Rights Agent pushes royalty payouts, requests approval when a payout breaks the standing AP2 mandate, and drops an Arcscan receipt in a payout inbox. |

The header is responsive: desktop shows a full nav bar with the mode and currency toggles; mobile collapses navigation into a hamburger sheet so the wallet chip and toggles stay reachable.

### Mobile UX

On mobile the hamburger sheet replaces the top nav. It opens into a drawer with the site links, a dedicated **Wallet** section showing live USDC / EURC / cirBTC balances, and the global currency selector. A site-wide footer adds quick GitHub and Arcscan links so judges can jump to source or explorer from any screen.

### On-chain claim offers (A2H)

Tapping **Claim offer** logs an agent-side receipt to the `DanceMoveTokens` registry via Circle SCP (no user wallet prompt, no user gas), returns a claim code and an Arcscan receipt, and produces a signed AP2 `OfferClaim` mandate. The discount is applied at checkout. Claims are logged for audit and do not count against the daily payout cap.

### Settlement currency

A second header toggle picks the settlement token — **USDC**, **EURC** or **cirBTC** — and applies to all four modes at once. It persists to `localStorage` and rides in the `?pay=` query param, so `/?mode=a2a&pay=cirBTC` links a judge straight into an agent-to-agent run priced in wrapped BTC.

- **USDC** is Arc's gas token, so paying it is a native value transfer.
- **EURC** (6 decimals) and **cirBTC** (8 decimals) are ERC-20s, settled with `transfer()` — gas is still paid in USDC.
- `purchase.ts` quotes all three in its `402` challenge and verifies whichever arrived: native `value` for USDC, matching `Transfer` logs for the ERC-20s.
- Fiat list prices convert through a **live FX feed** in `src/lib/fx.server.ts`: GBP/EUR rates from [Frankfurter](https://www.frankfurter.app) and BTC/USD from [CoinGecko](https://www.coingecko.com), cached for 5 minutes with hardcoded fallbacks. The feed is exposed to client components via the `fetchFxRates` server function and used by the cart, negotiation, agent run, A2H inbox, and protocol endpoints.

### Balances

Wallet balances for USDC, EURC and cirBTC are read through ERC-20 `balanceOf` via the same-origin RPC proxy, then converted from atomic units using each token's configured decimals. A safety guard re-normalises any value above 1B units in case an RPC provider returns native USDC in 18-decimal atomic units instead of 6, so the UI always shows normal human-readable amounts.

The **Treasury Panel** in the A2H inbox surfaces the treasury address and its live Arc balances, with an amber warning when USDC gas drops below `0.5` so users know to top up before approving payouts.



**Agent surface** (all under `src/routes/api/public/`, callable by external agents):

- `agent-card.ts` — A2A 0.3 agent card / capability discovery
- `catalog.ts` — machine-readable product catalog
- `purchase.ts` — x402 challenge, settlement, and signed receipt
- `arc-rpc.ts` — same-origin JSON-RPC proxy so the Alchemy key never ships to the client
- `x402/resources.ts` — StreetRail published in the Circle Agent Marketplace discovery shape
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

## Circle products used

| Product | Where it runs | Notes |
| --- | --- | --- |
| **Circle Wallets** | `scripts/bootstrap-circle.mjs`, `src/lib/circle.server.ts` | Developer-controlled treasury EOA on Arc Testnet — the Rights Agent's own wallet, signed with an entity secret. |
| **Circle Contracts (SCP)** | `scripts/deploy-arc.mjs` | `DanceMoveTokens` deployed from the Circle wallet with USDC gas, no EOA private key, then verified on Arcscan. |
| **Nanopayments** | `src/lib/nanopay.server.ts` | Gateway batching (`@circle-fin/x402-batching`) signs the EIP-3009 authorization for the A2A x402 loop; falls back to a direct Arc transfer when the agent balance is unfunded. |
| **App Kits** | `src/lib/appkit.server.ts` | Unified Balance Kit reports spendable USDC across chains; Swap Kit quotes back the USDC / EURC / cirBTC toggle. |
| **Gas Station** | Wallet-set policy | Sponsors agent gas on Arc. **Paymaster is intentionally unused** — USDC is already Arc's native gas token, so a USDC paymaster abstracts nothing. |
| **Agent Stack** | `src/lib/discovery.server.ts` | The buyer agent resolves payable services through Circle's public x402 Marketplace Discovery API before negotiating. |

Live status for all six is rendered in-app by `CircleRailsPanel` on the A2A and H2A screens, including the honest "unavailable, falling back" states.

### Agent Marketplace Discovery

The buyer agent does not hardcode StreetRail's checkout URL. Instead it calls Circle's public, keyless x402 Discovery API (`https://api.circle.com/v2/x402/discovery/resources`), filters for resources that settle on Arc Testnet, and selects the matching rail by network + scheme. The response is normalised defensively and cached server-side for 5 minutes. If Circle is unreachable, the agent falls back to StreetRail's own local resource published at `/api/public/x402/resources`, so the demo keeps working offline.

---

## On-chain

- **Contract:** `contracts/DanceMoveTokens.sol` — `log(address token, uint256 amount, string cid)` emits `MoveLogged` after pulling the fee via `transferFrom`.
- **Deployed:** [`0x4d13b45f823f8944522890c20d8695b6005465f0`](https://testnet.arcscan.io/address/0x4d13b45f823f8944522890c20d8695b6005465f0) — verified on Arcscan.
- **Deploy path:** Circle Smart Contract Platform, via the scripts below.
- **Compiler:** `solc 0.8.24`, pinned to match the Arcscan verifier.

### Treasury authorization (ERC-1271)

`contracts/StreetRailAuthorizer.sol` is a lightweight ERC-1271 authorizer for the treasury/agent wallet, so Gateway actions can be authorized without an EOA delegate.

- **Deployed:** [`0x0519c703cde7cbff6829fdfdcfe8c9a4c7aac327`](https://testnet.arcscan.io/address/0x0519c703cde7cbff6829fdfdcfe8c9a4c7aac327) — verified on Arcscan.
- **Modes:**
  - Pre-approved digests via `approveHash` — no EOA delegate needed.
  - Time-boxed delegate signers for temporary authorization.
- A2H payouts and mandate renewals carry an `onChainAuth` block; the inbox shows the ERC-1271 magic value `0x1626ba7e` when the digest is approved on-chain.
- Public status endpoint: `/api/public/erc1271/authorizer`.

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

The project uses **Lovable Cloud** for managed PostgreSQL, Auth, and Storage. Runtime configuration lives in project secrets, not a committed `.env`. Names only:

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

---

## Lessons learned

A short, polished post-mortem covering both the hackathon sprint and the product architecture.

### What worked

- **One contract, one rail, four modes.** Keeping H2H, H2A, A2A and A2H payments on the same Arc testnet contract made the demo coherent and gave judges a single explorer link to verify every flow.
- **Circle SCP + pinned solc.** Compiling, deploying and verifying `DanceMoveTokens.sol` through one script path, with `solc 0.8.24` pinned to the version Arcscan expects, saved hours of verifier mismatch.
- **Public RPC proxy.** Routing all client JSON-RPC through `/api/public/arc-rpc` let us use an Alchemy endpoint without leaking keys in the browser bundle or mobile preview.
- **Live FX feed.** Caching Frankfurter/CoinGecko rates server-side for five minutes made stablecoin prices feel real while staying inside free-tier limits.
- **Real A2H payouts.** Moving the A2H inbox from mocked data to on-chain `MoveLogged` events plus Circle treasury transfers turned the agent-to-human mode from theatre into a verifiable flow.
- **Ed25519 mandates.** Signing AP2 mandates with canonical JSON and `@noble/curves` gave the protocol layer non-repudiation without pulling in heavy crypto libraries.

### What broke

- **Privy app ID propagation.** Mobile previews intermittently lost `PRIVY_APP_ID`, so we added a build-time fallback and a soft-failure wallet chip instead of crashing the whole page.
- **Circle entity secret registration.** Generating a fresh 32-byte secret and registering its ciphertext is a one-way, write-only step. A mismatch between the generated secret and the registered ciphertext blocks all SCP calls and the error looks like an auth failure.
- **Zod negotiation schemas.** The first `SellerQuoteSchema` required fields that AIsa sometimes omitted, causing empty negotiation transcripts until we normalized optional fields.
- **Multi-decimal arithmetic.** Mixing USDC/EURC (6 decimals) with cirBTC (8 decimals) produced off-by-100 quote bugs; we centralized `toAtomic`/`fromAtomic` helpers per token.
- **Seeded A2H data.** The inbox initially showed fake payouts with fake transaction hashes; users rightly called it simulated, so we replaced it with live event logs.
- **Discovery API shape drift.** Circle's marketplace response is undocumented and sparse on Arc Testnet resources; a defensive normaliser plus a local fallback prevents the agent run from failing when the catalog shape changes.
- **18-decimal USDC balances.** Some RPCs return native USDC `eth_getBalance` in 18-decimal atomic units even though Arc USDC is 6 decimals. Reading balances through ERC-20 `balanceOf` and adding a re-normalisation guard fixed wallet chips showing trillions of dollars.

### Best practices

- **Keep secrets server-side.** `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `ARC_RPC_URL`, and `AISA_API_KEY` never ship to the browser. The only client-side credential is `PRIVY_APP_ID`, which is publishable.
- **Use deterministic canonical JSON before signing anything.** It prevents key-order and whitespace attacks in AP2/UCP mandates.
- **Proxy, do not embed.** Any RPC or AI key should go through a same-origin server route or server function.
- **Treat testnet like mainnet.** Decimals, gas limits, and receipts deserve the same rigor even when the tokens have no financial value.
- **Keep the contract small.** `DanceMoveTokens.sol` stays under 100 lines, which makes verification, auditing, and explaining it to judges easier.

### What we would do differently next time

- **Start schema-first for A2A messages.** We iterated the agent-card/AP2/UCP payloads while building the UI; a shared Zod/JSON Schema contract from day one would have prevented several integration rewrites.
- **Separate the move-registry fee from merch payments earlier.** The registry currently charges a fee to log a CID; for a production merch-first product we would make provenance logging optional or sponsor it from the treasury.
- **Add a testnet faucet and monitoring page.** Judges and new users should be able to see their balance and get gas USDC without leaving the app.
- **Build agent e2e tests.** We validated A2A flows manually; a headless agent-client test suite would catch mandate and signature regressions.
- **Package the chain config.** Token addresses, decimals, and ABIs should live in a generated config package rather than being scattered across `src/lib/tokens.ts` and the deployment scripts.
- **Add a dedicated A2H notification channel.** Today the inbox polls on-chain logs; a push channel such as webhooks, email, or XMTP would make agent-to-human payouts feel immediate.
