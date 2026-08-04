# GX mode — agent-to-agent commerce alongside the human app

Add a global **H2H / GX** toggle. Everything that exists today stays exactly as it is and becomes the "H2H" (human UX) view. Flipping the switch reveals the same commerce as a generative agent interface: typed, signed objects that a buying agent discovers, negotiates over, and settles in USDC on Arc.

This implements leads **1, 2, 3, 4** from the GX brief — the suggested hackathon slice — with lead **10** as the surface.

## The toggle

A pill switch in the header, next to the wallet button: `H2H · GX`. It is a global mode, persisted to `localStorage` and reflected in the URL as `?mode=gx` so a judge can be linked straight into the agent view.

- **H2H** — the app as it is now. Nothing changes.
- **GX** — the header, `/`, `/shop` and `/product/$handle` swap their body for the agent-native rendering of the same data. Markets and Deck are unaffected.

Judges can flip back and forth mid-demo on the same product, which is the whole argument: one catalog, two interfaces, only one of them needs a human.

## What GX mode shows

**1. Agent Storefront Card (lead 1)**
A real, fetchable `/.well-known/agent-card.json` plus a machine-readable catalog endpoint, both served by the app. The GX home renders that card as the storefront's identity: skills (`browse_catalog`, `quote`, `purchase`), supported payment rails, Arc chain id, and the `DanceMoveTokens` rights-registry pointer. A "fetch it yourself" panel shows the live JSON response so judges can see it is a real endpoint, not a mock.

**2. Typed offer objects instead of product cards (lead 6, light)**
In GX mode a product renders as its A2A artifact: SKU, size set, price in USDC/EURC/cirBTC, availability, and a provenance line pointing at the on-chain move-royalty record. Same Shopify data, no marketing layout.

**3. x402 micro-checkout on Arc (lead 2)**
The buying agent requests the purchase endpoint and gets a real **HTTP 402** back carrying a payment challenge (amount, token, recipient, chain). The agent pays USDC on Arc from the Privy embedded wallet, re-sends the request with the payment proof, and the server verifies it on-chain before returning the fulfilment object. Every step is streamed into a task timeline with the real transaction hash linked to Arcscan.

**4. Checkout interrupt (lead 3)**
The autonomous run halts at the payment step and emits a structured approval request — "confirm 89.00 USDC on Arc to `0x…`" — with the reason, the constraint that triggered it, and approve/reject. This is the generative replacement for the Privy modal. Approving resumes the run from where it stopped.

**5. Spend-policy manifest (lead 4)**
An editable per-agent policy: max per item, daily cap, category allowlist, and the threshold above which a human must confirm. It is rendered as the AP2 payment-mandate constraint set and it is genuinely enforced — a purchase over the cap is refused by the client before any network call, and one over the confirmation threshold is what triggers the interrupt in step 4. Changing a limit visibly changes the run.

**6. Run ledger**
The task timeline with every event: discovery, quote, policy check, interrupt, 402 challenge, settlement, receipt. Each entry is expandable to its raw JSON payload, because in GX the payload *is* the interface.

## Technical notes

- Mode lives in a small `useGxMode` hook (localStorage + `?mode=gx` search param), read by the header and the three commerce routes. No router restructuring, no new dependencies.
- `public/.well-known/agent-card.json` for the static discovery document; a TanStack server route under `src/routes/api/public/` for the catalog and the 402-guarded purchase endpoint, so both are reachable by an external agent without auth.
- Payment is a real USDC transfer on Arc Testnet signed by the existing Privy embedded wallet, using the chain config already in `src/lib/arc-chain.ts` and `src/lib/tokens.ts`. The server verifies the transaction receipt before releasing the resource. No new contract and no Circle SCP work — `DanceMoveTokens` at `0x4d13…65f0` stays as-is and is referenced by the agent card.
- x402 here is the challenge/settle/verify shape over a real on-chain payment. It is not a full x402 v2 facilitator with EIP-3009 `transferWithAuthorization` and Gateway batching; that is the natural next sprint and the deck should say so rather than overclaim.
- Existing components are untouched — GX renders as sibling components, so H2H cannot regress.

## Out of scope for this pass

ERC-8004 identity/reputation registries (lead 7), negotiation transcripts (8), escrowed collab splits (9), and Vyper contract work. They stay on the PRD roadmap.
