# Plan — Rewrite §17 Tasks around the Encode × Arc timeline

Replace the current generic §17 backlog in `PRD-DanceMoveTokens.md` with a dated, milestone-driven plan that maps directly onto the hackathon checkpoints and the two judging tracks (DeFi + Agentic Economy). Also add a short §18 mapping the work to the "What we're looking for" bullets so judges can score us fast.

No code changes in this pass — only the PRD.

## Anchor dates (from the Encode dashboard)

- **Today:** Thu 23 Jul 2026
- **Checkpoint 2 — Sun 26 Jul:** mid-submission (repo link + progress summary)
- **Registration closes — Sat 8 Aug**
- **Checkpoint 3 (Final) — Sun 9 Aug:** functional MVP on Arc, public repo, 3-min video + demo, deck
- **Demo Day — Thu 20 Aug**

That gives us ~2.5 weeks of build, 1 week of polish/video, 1 buffer week before Demo Day.

## Track positioning (why we can win)

We enter **both tracks** with the same repo — allowed per the rules ("You can enter more than one track with the same project if it genuinely meets the requirements for each track").

- **Agentic Economy** (primary): a "Rights Agent" that autonomously licenses a dance-move clip — on-request it pulls the CID, quotes a price in USDC/EURC/cirBTC, pays the choreographer's treasury, and stamps `Logged` on-chain. Uses **Agent Stack** + **Circle Wallets** + **Nanopayments** for per-play micro-royalties.
- **DeFi** (secondary): the streetwear merch checkout becomes a **multi-stablecoin settlement flow** using **App Kits** (Send + Unified Balance) so a buyer holding EURC/cirBTC pays a USDC-priced item in one click; treasury auto-sweeps to USDC.

Both tracks reuse the existing contract, Privy auth, and Shopify storefront — no rewrite.

## New §17 structure (dated sprints)

### Sprint 0 — Checkpoint 2 prep (23–26 Jul)
Ship the mid-submission with a clean repo + updated README + a live URL that already shows the winning story.

- Update `README.md` hero with the two-track pitch + Arcscan link `[lead] (S)`
- Add a `/agent` route stub with an "Ask the Rights Agent" input (mock response OK for CP2) `[frontend] (M)`
- Wire cart checkout copy to say "Pay in USDC, EURC or cirBTC — settled to treasury in USDC" (still Shopify checkout under the hood) `[frontend] (S)`
- Push mid-submission on the Encode project page with repo + short progress note `[lead] (S)`

### Sprint 1 — Agentic Economy build (27 Jul – 2 Aug)
- Fork patterns from `circlefin/agent-stack-starter-kits` — pick the wallet-holding-agent template as the base `[contracts+backend] (L)`
- Add server function `licenseMove({ cid, token })` — quotes price, calls contract `log()`, returns tx hash `[backend] (M)`
- Build a small AI Rights Agent (AI SDK + Lovable AI Gateway, `google/gemini-2.5-flash`) with tools: `quoteLicense`, `payAndLog`, `getMoveMetadata` `[backend] (L)`
- Chat UI on `/agent` using AI Elements — streams agent thought, shows tool calls, renders Arcscan link on success `[frontend] (L)`
- Add on-page transcript export ("proof of license") `[frontend] (S)`

### Sprint 2 — DeFi / Nanopayments build (3–7 Aug)
- Integrate `circlefin/arc-nanopayments` for per-play royalty streaming to the choreographer wallet when a move is previewed `[backend] (M)`
- Add App Kits Unified Balance display in `TokenSwitcher` (real balances per token, not just chips) `[frontend] (M)`
- Add App Kits Send flow in `MintForm` to sweep incoming EURC/cirBTC → USDC treasury `[backend] (M)`
- New route `/treasury` showing recent `Logged` events + nanopayment stream (viem `getLogs`) `[frontend] (M)`
- Second verified contract if needed for nanopayments settlement `[contracts] (M)`

### Sprint 3 — Final submission polish (8–9 Aug)
- Registration closes **Sat 8 Aug** — confirm team + project page locked in `[lead] (S)`
- Full mobile QA at 360 / 390 / 414 px; Lighthouse ≥ 90 on `/`, `/shop`, `/agent` `[frontend] (M)`
- Empty-states, loading skeletons, error toasts everywhere `[frontend] (M)`
- Favicon, OG image, social meta per route `[design] (M)`
- Final `README.md` runbook: bootstrap → deploy → verify → run agent locally `[lead] (M)`
- **Record 3-min video** (script in §13): hook → agent demo → merch checkout → contract on Arcscan `[design+lead] (L)`
- Build the deck (10 slides max): problem, culture insight, architecture, live tx, tracks hit, team, ask `[lead] (M)`
- Submit CP3 on Encode by 23:59 AoE Sun 9 Aug `[lead] (S)`

### Sprint 4 — Demo Day prep (10–20 Aug)
- Pre-fund backup Privy wallet with USDC + EURC + cirBTC `[devops] (S)`
- Pin known-good IPFS CID for the stage demo `[lead] (S)`
- Second screen-recording of the flow as wifi-fail fallback `[design] (S)`
- Rehearse 2-min pitch 5× minimum with the team `[all] (M)`
- Prep 3 anticipated judge questions + crisp answers (custody, fees, why on-chain?) `[lead] (S)`
- Publish to `streetdancearc.lovable.app` and pin the release tag in the repo `[lead] (S)`

## New §18 — Judging criteria mapping

Short table showing which feature answers which bullet from the DeFi + Agentic Economy "What we're looking for" lists. Keeps judges from having to hunt.

| Criterion | Where we show it |
| --- | --- |
| Meaningful use of Arc + USDC | Contract on Arc (5042002), USDC as gas + payment token |
| Advanced programmable money flows | Nanopayments per-play royalties + auto-sweep to USDC treasury |
| App Kits usage | Unified Balance in `TokenSwitcher`, Send in `MintForm` |
| Agent Stack usage | `/agent` Rights Agent with wallet, tools, and autonomous settlement |
| Autonomous spending / settlement | Rights Agent pays choreographer without a human click |
| Real-signal decision logic | Agent quotes price from CID metadata + treasury balance |
| Nanopayments / Paymaster | Nanopayments stream on move preview |
| Shows why stablecoin-native infra changes what's possible | Streetwear checkout in any stablecoin, one contract stamp |

## Deliverables

- `PRD-DanceMoveTokens.md` — §17 rewritten as above, new §18 appended.
- No source-code changes in this plan.

## Out of scope for this pass

- Actual implementation of the Rights Agent, Nanopayments, or App Kits wiring — those are Sprint 1–2 tasks, executed in later build turns.
- Any changes to `README.md`, contracts, or app routes.
