# Three modes: H2H · H2A · A2A

Today the app has a two-way toggle: **H2H** (the shoppable site) and **GX** (everything agentic lumped together). Split that into three distinct modes so judges can see each interaction pattern on its own.

## The three modes

| Mode | Label in toggle | What it shows |
|---|---|---|
| H2H | **H2H · UX** | Current human storefront: hero, featured merch, shop grid, product pages, cart, Privy checkout. Unchanged. |
| H2A | **H2A · GX** | Human delegates to an agent: chat-style brief, spend policy panel, human interrupt/approval card, agent run ledger, receipt. |
| A2A | **A2A · x402** | Machine-to-machine: agent card, UCP discovery, AP2 mandate, the AIsa buyer/seller negotiation, and the x402 402-challenge → settle → receipt flow with live endpoint list. |

## What changes

**Mode state** (`src/lib/gx-mode.ts`)
- `GxMode` becomes `"h2h" | "h2a" | "a2a"`.
- URL param accepts `?mode=h2a` / `?mode=a2a`; legacy `?mode=gx` and the stored `gx` value map to `a2a` so old links keep working.

**Toggle** (`src/components/gx/ModeToggle.tsx`)
- Three segments instead of two, with hint text per mode. Stays compact on mobile (short labels, no wrapping).

**Home** (`src/routes/index.tsx`)
- `h2h` → current page.
- `h2a` → new `H2aHome` view.
- `a2a` → existing `GxHome`, re-titled for agent-to-agent and trimmed of the delegation framing.

**Shop / product** (`src/routes/shop.tsx`, `src/routes/product.$handle.tsx`)
- `h2h` → current UI.
- `a2a` → existing `GxShop` / offer JSON view.
- `h2a` → the same catalog rendered as an agent brief: pick an item, set a spend policy, let the agent run and ask for approval.

**New component** `src/components/h2a/H2aHome.tsx`
- Composes existing pieces rather than new logic: `AgentChatBubble`, `SpendPolicyPanel`, `InterruptCard`, `AgentRunPanel`, `RunLedger`.
- Copy frames it as "you set the budget and the rules, the agent shops for you".

**A2A view** (`src/components/gx/GxHome.tsx`)
- Headline and copy shift to agent-to-agent + x402; keeps the seven endpoints, agent card JSON, and a link to the negotiation page.
- x402 challenge/receipt gets a visible step block so the 402 flow is the hero of this mode.

**Deck** (`src/components/deck/slides.tsx`)
- The existing "Three interfaces, one rail" slide already names H2H/H2A/A2A; update it to say the live app has all three behind the toggle.

## Technical notes

- No backend/API changes — all `/api/public/*` routes stay as they are; H2A and A2A both consume them.
- `AgentNegotiation` and the negotiation route stay untouched, reachable from A2A mode.
- Every consumer of `useGxMode` currently branches on `mode === "gx"`; those become explicit three-way branches so nothing silently falls through to H2H.
- Mobile: the three-segment toggle uses the existing pill styling with tighter padding to stay on one row at 360px.

## Verification

Render each mode at 390px and 1280px via Playwright, confirm no horizontal overflow, and check that `?mode=gx` still lands on A2A.
