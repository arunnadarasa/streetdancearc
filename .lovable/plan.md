# Correct the hackathon attribution to Encode

The site still credits the old "Creative AI & Quantum Hackathon organised by StreetKode Fam during Indian Krump Festival 14". StreetRail was actually built for Encode Club's **Programmable Money Hackathon — Build on Arc** (13 July 2026, 7 weeks online, final submissions 9 August 2026), Agentic Economy track.

## What changes

- **Footer** — replace the credit line with: "Built for the Encode Club Programmable Money Hackathon — Build on Arc. Agentic Economy track. Running on Circle's Arc Testnet." Link "Programmable Money Hackathon" to the Encode programme page, alongside the existing GitHub link.
- **Deck** — align the title-slide kicker and the deck page eyebrow to the same wording ("Encode Club · Programmable Money Hackathon · Build on Arc").
- **README** — update the intro/credit line to the Encode hackathon, track, and submission date.
- **Contract source comment** — update the NatSpec credit in `contracts/DanceMoveTokens.sol` so the repo reads correctly. Note: the deployed and verified contract at `0x4d13b45f…5465f0` keeps its original bytecode/comment; this is a source-only change and I will not redeploy or re-verify.

## Left as-is unless you say otherwise

- Agent-card `provider.organization: "StreetKode Fam"` and the `author` meta tag — these are your org identity, not the hackathon, so they stay.
- The on-chain `note` string used at deploy time (already immutable).

## Technical notes

Files touched: `src/components/layout/SiteFooter.tsx`, `src/components/deck/slides.tsx`, `src/routes/deck.tsx`, `README.md`, `contracts/DanceMoveTokens.sol`. Presentation-only; no contract redeploy, no backend changes.
