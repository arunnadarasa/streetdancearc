# StreetRail Primer — web3 for dancers

## Goal
Add a beginner-friendly primer that explains StreetRail's tech in street-dance terms, so dancers with zero web3 knowledge can understand what agentic, blockchain, x402, UX/GX, H2H/H2A/A2A/A2H, stablecoins, gas, and Arc actually mean.

## Where it lives
- New route `/primer` linked from the top nav (desktop) and mobile drawer.
- Optional teaser band on the home page pointing to `/primer`.

## Content architecture
A single scrollable page split into short cards, each pairing a dance concept with a web3 concept:

1. **The Cypher = the blockchain (Arc)**
   - The cypher is the circle where everyone can see every move. Arc is the digital cypher: every payment and rights record is visible to all, in order, and can't be erased.

2. **Your signature move = your transaction**
   - When you throw your signature, everyone knows it's you. A transaction is your digital signature move — it proves you did something on the rail.

3. **The crew = agents**
   - Agentic means software that acts like a crew member: it can shop, negotiate, or pay on your behalf once you give it the rules.

4. **The setlist = mandate (AP2)**
   - Before a battle, you agree on the setlist. A mandate is the digital setlist: it says what the agent is allowed to spend, on what, and for how long.

5. **Four battle formats = the four modes**
   - **H2H / UX**: Human-to-human. You browse the shop like any store.
   - **H2A / GX**: Human-to-agent. You tell the agent what you want; it battles the market for you.
   - **A2A / x402**: Agent-to-agent. Two bots negotiate and settle without you touching checkout.
   - **A2H / inbox**: Agent-to-human. The rights agent pays choreographers automatically and asks for your okay when needed.

6. **x402 = "Payment Required" pass**
   - Like a bouncer checking your wristband before you enter. x402 is the protocol that says "show me the receipt, then you get the goods."

7. **Stablecoins = battle money that doesn't bounce**
   - USDC, EURC, cirBTC are digital dollars/euros/bitcoin that keep their value, so a prize purse doesn't shrink between the battle and the bank.

8. **Gas = the door fee**
   - On Arc, USDC is the door fee. You don't need a second token; the same stablecoin you pay with covers the network cost.

9. **Move registry = the rights wall**
   - Dancers log a choreography CID on-chain. Every merch drop tied to that move inherits the credit, so creators get paid when their style travels.

10. **Wallet = your dance ID**
    - Privy gives you an embedded wallet with Google login. It's like a digital dance card that holds your stablecoins and signs your moves.

## Design approach
- Reuse existing `Section`, `SectionHead`, and `Reveal` components.
- Card grid with dance-term header + web3-term header + one-paragraph explanation.
- Add a small glossary table at the bottom for quick lookup.
- Keep the StreetRail dark/aurora aesthetic; no new colors.
- Mobile-first: cards stack, glossary becomes a scrollable list.

## Navigation updates
- Add `{ to: "/primer", label: "Primer" }` to `Header.tsx` `NAV` array.
- Add a corresponding row to `MobileDrawer.tsx` `NAV_ROWS`.
- Optional home teaser: a short band on `/` with a "New to web3? Read the primer" CTA.

## Out of scope
- No new backend or server functions.
- No new dependencies.
- No changes to existing modes, shop, or contracts.
