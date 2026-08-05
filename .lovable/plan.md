# Hackathon submission — updated copy

Paste-ready text for the Encode Club Final Submissions form (deadline Mon 10 Aug 2026, 12:59 London).

## Project Name

```text
StreetRail
```

Alternative if the organisers require continuity with the earlier checkpoint entry:

```text
StreetRail (formerly DanceMove Tokens)
```

## Project Description (short — ~50 words)

```text
StreetRail is a street-dance streetwear marketplace with an on-chain move-rights
registry, running on Circle's Arc Testnet. Shoppers check out in USDC, EURC or
cirBTC. Three interfaces share one payment rail: H2H storefront, H2A agent with
spend guardrails, and A2A machine-to-machine checkout over x402.
```

## Project Description (long — use if the field allows more)

```text
StreetRail is a streetwear marketplace and dance-move rights registry for
street-dance culture, built on Circle's Arc Testnet where USDC is the gas token.

Dancers buy physical merch — sneakers, snapbacks, baseball jackets, trousers,
socks, tees, bandanas — and pay in USDC, EURC or cirBTC. Every drop is backed by
an on-chain registry where dancers log original moves, creating a timestamped
rights record that can be licensed.

The differentiator is that the same commerce rail serves three interfaces:

- H2H (UX) — a conventional storefront with Privy Google login and an embedded
  Arc wallet, so there is no seed phrase and no card.
- H2A (GX) — the shopper delegates to an agent with AP2 spend policies
  (budget caps, token allow-list, per-item limits); the agent negotiates and
  settles, the human approves the mandate.
- A2A (x402) — a buyer agent discovers the storefront's agent card, negotiates
  over A2A 0.3 / UCP, and settles machine-to-machine via x402 payment challenges
  with no human in the loop.

Payments settle on Arc Testnet (chain 5042002) against a Solidity contract
deployed through Circle's Smart Contract Platform and verified on Arcscan.
Stablecoin-denominated checkout matters most in high-FX-volatility markets —
Nigeria, Argentina, the Philippines — which the app surfaces in a dedicated
markets view.
```

## Supporting fields

| Field | Value |
| --- | --- |
| Live demo | https://streetrail.lovable.app |
| Track | Programmable Money (Arc / Circle) |
| Chain | Arc Testnet — chain id 5042002, USDC as gas token |
| Contract | `0x4d13b45f823f8944522890c20d8695b6005465f0` — verified on Arcscan |
| Explorer | https://testnet.arcscan.app/address/0x4d13b45f823f8944522890c20d8695b6005465f0 |
| Tokens accepted | USDC, EURC, cirBTC |
| Interactive deck | https://streetrail.lovable.app/deck (13 slides, in-app, mobile-friendly) |

## Judge walkthrough (30 seconds)

```text
1. Open the site, sign in with Google — Privy provisions an Arc embedded wallet.
2. Toggle H2H / H2A / A2A in the header to see the same rail under three interfaces.
3. Shop a piece, pick USDC / EURC / cirBTC at checkout.
4. Log a move in the registry — the tx lands on Arcscan.
5. /agent-negotiation shows the live A2A 0.3 → AP2 → UCP → x402 transcript.
6. /markets covers the FX-volatility thesis; /deck is the full pitch.
```

## Notes

- The contract keeps its original `DanceMoveTokens` name on-chain; only the
  product is renamed to StreetRail. Mentioning this avoids a judge flagging a
  name mismatch between the submission and Arcscan.
- No code changes are needed for this — it is submission copy only. If you want,
  the same description can also be dropped into the site footer or the deck's
  title slide for consistency.
