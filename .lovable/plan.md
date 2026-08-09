# Judge-facing transaction list

## Goal

After any payment settles on Arc, it lands in a running "Settled on Arc" list a judge can scan in one glance: what was bought, which mode paid for it, how much, in which stablecoin, and a live Arcscan link.

## Where transactions come from today

Four surfaces settle real Arc transactions, and none of them keep a record after the panel resets:

- Cart checkout (H2H) — `CartDrawer`
- Agent run (H2A) — `useAgentRun`
- Agent negotiation (A2A) — `AgentNegotiation`
- Payout inbox (A2H) — agent-side payouts, hash returned from the server

## What gets built

**1. A shared settlement ledger**
Every settlement records one entry: timestamp, mode (H2H / H2A / A2A / A2H), a human label ("Arc Varsity Baseball Jacket ×1", "Snapback — negotiated"), amount, token, counterparty address and tx hash. Stored in the browser so the list survives page changes and reloads during a demo, capped at the most recent 50.

**2. A transaction list panel**
Newest first, each row showing: relative time, mode chip, label, amount with token symbol, shortened counterparty, and an Arcscan link plus copy-hash button. Mobile collapses to a stacked card; desktop is a table-ish row. Empty state reads "No settlements yet — buy something in the shop or run a mode."

Each row also shows a confirmation state pulled from Arcscan (pending / success / failed) so a judge sees the chain agreeing, not just a local record. A "Clear list" control resets it for the next judge.

**3. Where it appears**
- `/judge` — a new final "Everything that settled" section, so the guided run ends on the evidence.
- Cart drawer — the last three settlements under the pay button, so the receipt does not vanish when the drawer closes.

## Technical notes

- New `src/lib/tx-log.ts`: typed entry shape, `recordSettlement()`, `useTxLog()` hook over `localStorage` with a storage event listener so multiple tabs stay in sync.
- Call `recordSettlement` at the four settle sites (`CartDrawer.tsx`, `useAgentRun.ts`, `AgentNegotiation.tsx`, A2H inbox component) right after a hash is returned. No change to `settleOnArc` itself.
- New `src/components/dance/TxHistoryPanel.tsx`, reusing existing card/chip styling and `ARC_EXPLORER` from `src/lib/tokens.ts`.
- Status lookup: a server function hitting `https://testnet.arcscan.app/api/v2/transactions/{hash}` for hashes still marked pending, batched on panel mount and on a manual refresh — same fetch pattern as `market-activity.server.ts`, no new secrets.
