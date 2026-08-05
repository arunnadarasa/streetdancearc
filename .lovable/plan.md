# Refresh the README for GitHub

The README still describes the original two-part demo (move registry + Shopify merch). It predates the three interaction modes, the agentic protocol stack, the interactive deck, the markets research page, and the new RPC proxy. Rewriting `README.md` in the project is what updates GitHub — the repo stays in sync automatically once connected.

## New structure

1. **Header** — Dance Move Tokens: streetwear commerce on Circle's Arc Testnet, shoppable by humans and by agents. Live URL, chain id, one-line pitch.
2. **Three modes** — a short table:
   - `H2H · UX` — the shoppable storefront (merch primary, move registry secondary)
   - `H2A · GX` — human delegates a purchase to an agent with a spend policy and audit ledger
   - `A2A · x402` — agent card discovery, UCP/AP2 mandates, AIsa negotiation, x402 402 → settle → receipt
   Mode is driven by `?mode=` and persists across routes; legacy `?mode=gx` maps to A2A.
3. **Marketplace** — keep the catalog list, note the product imagery and cart/checkout flow, refresh the file list to current components.
4. **On-chain** — contract, deployed + verified address, Circle SCP deploy path, pinned `solc 0.8.24`.
5. **Arc network config** — chain id 5042002, USDC as 6-decimal gas token, Arcscan, token address table (unchanged), plus the new RPC setup: browser traffic goes through `/api/public/arc-rpc` so the Alchemy provider key set in `ARC_RPC_URL` never reaches the client; falls back to the public Arc RPC when unset.
6. **Other routes** — `/deck` (interactive judges' deck), `/markets` (FX-volatility research), `/moves`, `/agent-negotiation`.
7. **Local setup** — install, run, and the environment/secret list (`PRIVY_APP_ID`, `ARC_RPC_URL`, `CIRCLE_*`, `AISA_API_KEY`, Shopify storefront values), noting secrets live in project settings rather than a committed `.env`.
8. **Scripts** — bootstrap / deploy / verify, one line each.
9. **Reference docs** — keep existing links, add the x402 and AP2/A2A references.

## Notes

- No secret values in the README — names only.
- Route and component names will be confirmed against the codebase while writing so nothing referenced is stale.
- If the project is not yet connected to GitHub, the file still updates here and pushes on the first connect.
