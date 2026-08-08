# Update the Arc skill with everything we learned

The `lovable-arc` skill still reflects day-one knowledge: chain constants, the `VITE_` secret trap, Circle entity-secret onboarding, SCP deploy payload and Arcscan verify. Since then this project shipped four contracts, an RPC proxy, an indexer, NFT + marketplace + royalties, and hit a long list of Arc-specific failures that aren't captured anywhere. This updates the skill so a future build starts from the fixed version of all of it.

## Shape

Keep `SKILL.md` as the short navigation + hard-rules file and move depth into `references/`, so the skill stays cheap to load.

```text
.agents/skills/lovable-arc/
├── SKILL.md                       (rewritten, ~150 lines: constants, hard rules, ref index)
└── references/
    ├── circle-scp.md              entity secret, deploy, transfer, fee format, error mapping
    ├── rpc-and-indexing.md        Alchemy Arc RPC, getLogs limits, caching, Arcscan v2 API
    ├── contracts-and-verify.md    solc pinning, Blockscout verify, ERC-721/2981/1271 on Arc
    ├── payments-ux.md             USDC/EURC/cirBTC toggle, FX, decimals, Privy modal gotchas
    └── failure-modes.md           full symptom → cause → fix table
```

## What gets added (the new learnings)

**Successes worth reusing**
- Circle SCP as the deploy path — no EOA, USDC gas; four contracts deployed and verified this way (`DanceMoveTokens`, `StreetRailAuthorizer`, ERC-721 `MOVE`, `MoveMarket` v2).
- ERC-1271 authorizer contract so treasury/agent actions are authorized without an EOA delegate.
- ERC-2981 royalty split enforced atomically inside the marketplace buy, in whichever payment token was selected.
- Off-chain session ledger that batches nano-amounts and settles to Arc at a threshold — makes a 20-USDC/day faucet last a whole demo day.
- Arcscan v2 REST as a free indexer for activity/receipt panels instead of client-side log scans.
- Client-side UnixFS CIDv1 computation to verify a clip's hash before pinning.

**Failures and their fixes**
- `@circle-fin/*` SDKs break the Cloudflare Worker runtime — hand-rolled fetch adapters are the only workable path.
- Circle SCP rejects `gasPrice`-style fee objects; `feeLevel: "MEDIUM"` is the working form, and raw Circle errors need mapping to human text.
- Alchemy's Arc RPC caps `eth_getLogs` at a 10-block range and rate-limits wide scans: chunked windowing, a 5,000-block lookback cap, and a short server-side log cache.
- Never expose the RPC URL to the browser — proxy it server-side (also the `VITE_` prefix ban again).
- Local `solc` drift silently breaks Blockscout verification; pin the compiler and use an exact pragma.
- Privy's modal always shows the gas token (USDC) and leaves non-metadata token amounts blank — render your own pre-confirmation summary; gate zero-address tokens instead of skipping `approve`.
- Treasury gas exhaustion presents as an opaque payout failure — surface treasury address, balance and a `lowGas` warning.
- Faucet economics: size demo amounts to the 20 USDC/day drip.

**Best practices section** — demo-fallback over hard failure, one JSON file per deployed contract (`address`/`abi`/`chainId`/`explorer`) so the UI goes live without a code edit, a success-checkpoint list, and a "what I'd do differently" note (start with the indexer and the fee/error mapping instead of retrofitting them).

## Technical notes

- Draft is edited under `.agents/skills/lovable-arc/` (currently identical to the active copy), then activated with the skill-apply tool. Active skill files under `.workspace/skills/` are never edited directly.
- Frontmatter `description` gets extended with the new triggers (Circle SCP, ERC-1271, ERC-2981 royalties, Arcscan v2 indexing, Arc getLogs limits) so retrieval fires on those topics.
- Cross-links stay pointed at `dance-ucp-arc-circle` for CCTP/UCP and `evvm-privy-integration` for the SSR-safe Privy mount; no duplication.
- No application code is touched.
