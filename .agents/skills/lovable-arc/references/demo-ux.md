# Demo UX — the judge-facing layer

An Arc demo is judged on whether a reviewer can *see* that something settled.
These three patterns did more for perceived quality than any contract work.

## 1. Collapse the JSON, surface the receipt

Agent run ledgers (H2A/A2A step lists with request/response payloads) render as
a wall of code on mobile. Restructure the ledger, don't shrink the font.

Summary bar above the steps:

- state chip — `running` / `settled` / `failed`
- progress — `5/7 steps`, with a thin progress track
- **primary action**: `View receipt on Arcscan` for the terminal settlement tx,
  plus a copy-hash button. This is the single element judges look for.
- a master **Raw JSON** switch that force-expands every payload at once

Per step:

- prose-first title in bold (`Human confirmed spend`); technical titles
  (`POST /api/public/purchase`) get mono, smaller, muted
- payload collapsed by default behind a disclosure that advertises its size:
  `payload · 6 fields` / `· 24 lines`
- **auto-expand only when the step failed or was blocked** — a failure should
  never require a click to diagnose
- keying the payload component on the master-toggle value is the cheap way to
  make "Raw JSON" re-drive per-step local state

Linkify tx hashes inside payload text to `https://testnet.arcscan.app/tx/<hash>`
so the raw view is also navigable.

## 2. One settlement ledger across every payment mode

Every mode (H2H cart, H2A agent run, A2A negotiation, A2H payout/claim) writes
to a single client-side ledger. Judges get one list that proves the demo moved
real money.

Shape:

```ts
type TxRecord = {
  id: string;            // tx hash when known, else a uuid
  hash?: string;
  mode: "h2h" | "h2a" | "a2a" | "a2h";
  label: string;         // "Snapback cap ×1", "Move #12 royalty"
  amount: string;        // human decimals, already token-scaled
  token: "USDC" | "EURC" | "cirBTC";
  at: number;            // epoch ms
};
```

- persist to `localStorage`, newest first, cap at ~50 entries
- one `record()` helper imported by every settlement path; add the call in the
  same edit that adds the settlement, or it will never be added
- render relative time (`2m ago`), a mode chip, amount + token, an Arcscan link,
  copy-hash, and a **confirmed / pending** status
- resolve status from the Arcscan v2 REST API through a server function, with a
  manual refresh — do not poll the RPC from the browser
- surface the panel in at least two places: the judge route (all modes) and the
  cart/shop (H2H only, filtered)

## 3. Prefill demo inputs from live data, never hardcode amounts

Any demo input containing a number ("Buy a snapback under 0.03 USDC") rots the
moment catalog prices change, and the failure looks like a broken agent.

- compute the suggestion from the live catalog in a **client-safe shared
  module** so the server negotiator and the UI agree on one `deriveBudget`
- keep re-prefilling the field until the user edits it — track a `dirty` ref,
  not just "field is empty"
- show the derived number as a hint (`Recommended budget 0.052 USDC`) and a
  **Reset to recommended** link once the text diverges

## 4. Sticky chrome vs Radix menus

Radix `DropdownMenu`/`Select` default to `modal`, which sets `overflow: hidden`
and `position: relative` on `<body>` while open. That kills the containing block
for a `sticky` header — the header disappears mid-scroll the instant the menu
opens.

Pass `modal={false}` on every menu that is *not* a real overlay (nav "More",
currency toggle, filters). Behaviour and keyboard a11y are unchanged; the body
scroll lock goes away. Verify with Playwright: scroll ~1200px, open the menu,
assert the header's bounding box is still `y == 0`.
