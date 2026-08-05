# Pay in USDC, EURC or cirBTC — across all four modes

One currency choice, made once, honoured everywhere. Pick USDC, EURC or cirBTC in the header and every mode settles in that token on Arc Testnet: the merch checkout, the delegated agent, the agent-to-agent x402 flow, and the payout inbox.

## What changes for you

**A global currency pill** sits next to the H2H/H2A/A2A/A2H toggle. It shows your live balance for each token on Arc and remembers the choice across pages (and rides in the URL, like the mode does). Tokens you have no balance in still work but are flagged.

**H2H — merch.** The cart gets a second checkout path: "Pay on Arc". Choose the token, the cart total converts at a clearly-labelled demo rate, and a real transfer goes to the StreetRail treasury with an Arcscan receipt. The existing Shopify card checkout stays exactly as it is — this is an additional crypto path, not a replacement. Since Shopify cannot see an on-chain payment, the crypto path issues a StreetRail order receipt and says plainly that fulfilment is handled off Shopify.

**H2A — you delegate.** Your spend policy stays denominated in USDC (one stable yardstick for caps), but the agent settles in your selected token and the run ledger shows both: "0.028 USDC cap → paid 0.026 EURC".

**A2A — agents.** The 402 challenge names the selected asset. Buyer and seller negotiate in that currency, and the receipt carries the token symbol and contract address.

**A2H — payout inbox.** The standing mandate gains a settle-token row you can switch, and the seeded payouts, approvals and offers re-denominate to match.

## How settlement actually works

USDC is Arc's gas token, so paying in USDC is a native value transfer — that path already works and is untouched. EURC and cirBTC are ERC-20s, so those payments become a real `transfer(to, amount)` call to the token contract. Both produce a real Arc transaction and a real Arcscan link.

Note on decimals: cirBTC has **8** decimals, not 6. Amount maths goes through one shared helper so a cirBTC payment can never be off by 100×.

## Technical detail

**`src/lib/tokens.ts`** — extend each token entry with `native: boolean` (USDC true) and a demo FX rate against the listed fiat price. Add `toAtomic(amount, token)` and `formatAmount(atomic, token)` helpers so decimals live in exactly one place. Add a short comment marking the FX table as a fixed demo oracle, not a price feed.

**`src/lib/pay-token.ts`** (new) — a `TokenKey` context mirroring the existing `gx-mode.ts` pattern: localStorage persistence plus a `?pay=` search param, with a `usePayToken()` hook.

**`src/components/gx/PayTokenToggle.tsx`** (new) — header pill built on the existing `TokenSwitcher`, plus `balanceOf` reads (native `eth_getBalance` for USDC, ERC-20 `balanceOf` for the others) through the existing `/api/public/arc-rpc` proxy. Mounted in `Header.tsx` alongside `ModeToggle`.

**`src/routes/api/public/purchase.ts`** — `OrderSchema` accepts an optional `token` (defaults USDC). The 402 challenge emits the chosen asset address, symbol, decimals and atomic amount, and `extra.settlement` describes the right mechanism. Verification splits: USDC keeps the current `tx.value` check; EURC/cirBTC parse the receipt logs for the ERC-20 `Transfer` topic, asserting log address = token, `to` = treasury, and `value >= required`. Recipient, payer, replay-age and revert checks all stay.

**`src/components/gx/useAgentRun.ts`** — step 5 branches: native `sendTransaction` for USDC, `encodeFunctionData({ functionName: "transfer" })` to the token address for ERC-20s. `X-PAYMENT` gains the token key. Policy evaluation still runs on the USDC-equivalent value.

**`src/lib/agent-card.ts`, `catalog.ts`, `a2a/message.ts`, `ap2/mandate.ts`** — advertise all three assets in `paymentMethods`/`accepts` with correct CAIP-19 ids and decimals, instead of a single hardcoded USDC entry.

**`src/components/shop/CartDrawer.tsx`** — add the "Pay on Arc" button and a small settlement panel (token, converted total, treasury address, tx state, Arcscan link) reusing `useWallet` and the same transfer helper as the agent run. Extract that helper to `src/lib/settle.ts` so H2H, H2A and A2A share one code path.

**`src/components/a2h/`** — `STANDING_MANDATE.settle_token` becomes driven by the selected token; feed amounts convert through the same helpers.

**Deck and docs** — the interfaces slide and README gain a line that all four directions settle in any of the three Circle stablecoins. No new slide, no PDF/PPTX regeneration unless you want it.

## Verification

Live transfers on Arc Testnet from the funded wallet: one EURC agent purchase (A2A), one cirBTC cart checkout (H2H), one USDC run to confirm no regression — each checked for a real Arcscan tx and correct decimal handling. Plus a 384px pass on the header with both toggles present.
