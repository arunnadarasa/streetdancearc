# Final submission copy

The submission text is split into the two fields the form asks for. No app code changes are needed.

## Project Description (short field)

> A streetwear marketplace and dance-move rights registry for street-dance culture. Dancers log original moves on-chain and buy physical merch — sneakers, jackets, caps — paid in USDC, EURC, or cirBTC on Circle's Arc Testnet.

## Submission Details (long field)

> StreetRail is built entirely on Circle's Arc Testnet, where USDC is the native gas token.
>
> **What we built.** Dancers log original moves on-chain (clip pinned to IPFS, CIDv1 computed client-side and verified before pinning), mint them as ERC-721 "Move Rights" with ERC-2981 royalties, and list them on a marketplace where royalties are paid atomically inside `buy()`. Alongside that, a physical merch shop (sneakers, snapbacks, jackets, caps) settles in USDC, EURC, or cirBTC via a global currency toggle backed by a live FX feed.
>
> **Four settlement modes, one rail.** We ship H2H (human buys merch), H2A (human pays an agent for a licensed move), A2A (buyer and seller agents negotiate a merch deal and settle autonomously), and A2H (a rights agent detects a move in the wild and pays the choreographer into a claimable payout inbox). Every mode writes to a single cross-mode settlement ledger with live Arcscan links and confirmed/pending status, so the whole economy is auditable from one screen (`/judge`).
>
> **How it's wired.** Four contracts deployed and Blockscout-verified on Arc (5042002): DanceMoveTokens, StreetRailAuthorizer (ERC-1271 contract-signature authorization so treasury/agent actions need no EOA delegate key), MoveRights (ERC-721/2981), and MoveMarket v2. All deploys and agent payouts run through Circle's Smart Contract Platform — no funded EOA, no private key in CI, USDC gas straight from the Circle treasury wallet. Auth and embedded wallets are Privy (Google login provisions an Arc wallet). Nanopayments are batched off-chain in a session ledger at ~$0.001/unit and settle to Arc at a $0.50 threshold, so a 20 USDC/day faucet sustains a full day of live demos. Agent discovery uses Circle's Discovery API.
>
> **Process.** Built end-to-end on Lovable with TanStack Start on Cloudflare Workers. Hardest lessons: the Circle Node SDKs crash workerd, so we hand-rolled ~150-line fetch adapters against the Circle API using only Web Crypto; Arc rejects EIP-1559 fee objects, so every transaction uses `feeLevel: "MEDIUM"`; and the entity secret must be re-encrypted per request. We also swapped naive `eth_getLogs` sweeps for the Arcscan v2 REST API after hitting provider block-range caps. Two-agent negotiation closes ~90% of runs via derived budgets, seller floors, and a deterministic best-in-policy fallback — outcomes come from code, not prompt wording, and every LLM-emitted price is clamped to the catalog before it reaches a settlement path.
>
> **Tracks.** *Agentic Economy:* autonomous A2A negotiation and A2H payouts settle real USDC on Arc via Circle SCP, with ERC-1271 contract-signature authorization instead of an EOA delegate key. *DeFi:* multi-stablecoin settlement (USDC/EURC/cirBTC, 6/6/8 decimals) with a live FX feed, ERC-2981 royalties enforced atomically inside `buy()`, and off-chain nanopayment batching that settles to Arc at a threshold.
>
> Code: https://github.com/arunnadarasa/streetdancearc — live: https://streetrail.lovable.app

## Form fields

- **Project Name:** DanceMove Tokens
- **Project Description:** paste the short block above
- **Submission Details:** paste the long block above
- **Project Image:** the existing StreetRail banner already uploaded
- **Link to Code:** https://github.com/arunnadarasa/streetdancearc
- **Live URL:** https://streetrail.lovable.app
- **Tracks:** DeFi Track + Agentic Economy Track
- **Demo video:** your already-recorded video URL

## Notes

- No app code changes. Just copy/paste into the form.


