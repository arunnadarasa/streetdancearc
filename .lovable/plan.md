# Add A2A/AP2/UCP standards + AIsa conversational agents to GX mode

## Goal
Augment the existing GX agent-to-agent commerce surface with real A2A, AP2 and UCP protocol wiring, and add an AIsa-powered conversational buyer/seller agent demo. The existing H2H shop and the current GX x402-style purchase flow remain untouched; this work adds a deeper "protocol-native" demo layer that judges can flip into.

## Why this makes the project stand out
- **On-chain transactions** are already the wow factor (real USDC settlement on Arc Testnet with a live tx hash).
- Adding **A2A/AP2/UCP** turns the demo from a custom agent flow into an interoperable agent-commerce standard.
- **AIsa conversational agents** make the demo feel alive: a buyer agent and seller agent negotiate in natural language, then hand off to the on-chain settlement the app already has.

## What we will build

### 1. A2A agent discovery (lead 1)
- Extend the existing `/.well-known/agent-card.json` and `/api/public/agent-card` to be A2A 0.3 compliant: `message/send` skill, `tasks/get`, agent metadata, OAuth/verification hints.
- Add a new GX sub-page or panel that renders the agent card as a discoverable storefront identity.

### 2. UCP discovery + conformance (lead 5)
- Add `/api/public/ucp/discovery` and `/api/public/ucp/conformance/self-test` endpoints returning the canonical UCP checkout/order schemas.
- Surface a "UCP conformance" panel in GX mode so judges can see the app self-certifies its checkout protocol.

### 3. AP2 payment mandates (lead 4)
- Map the existing `spend-policy.ts` constraints into AP2-style signed payment mandates.
- Add a server route that returns an EIP-712 mandate envelope for the buyer agent to sign, and a verification helper that checks the mandate before settlement.
- The existing daily cap / per-item cap / human-confirmation threshold stay; they are now serialized as an AP2 mandate.

### 4. AIsa conversational buyer + seller agents (new)
- Add an `/agent-negotiation` route (or GX panel) with a split chat: buyer agent on the left, seller agent on the right.
- Buyer agent: powered by AIsa, given a goal ("buy a size L snapback under 25 USDC"), a spend policy, and the ability to call the catalog/purchase endpoints as tools.
- Seller agent: powered by AIsa, responds with offers, counters, and finally emits a structured UCP checkout intent.
- The conversation is streamed via AIsa and rendered in real time. When the agents agree, the buyer agent hands off to the existing x402/AP2 settlement flow.
- Conversation history is localStorage-only for the demo (no auth/db required).

### 5. x402 settlement stays as the payment rail
- The actual USDC transfer still uses the existing GX purchase flow (`/api/public/purchase` with 402 challenge + on-chain verification).
- A2A/AP2/UCP sit above it; x402 is the settlement layer below.

## Files to create / edit

### New files
- `src/routes/api/public/ucp/discovery.ts` — UCP discovery endpoint
- `src/routes/api/public/ucp/self-test.ts` — UCP conformance self-test
- `src/routes/api/public/ap2/mandate.ts` — AP2 mandate generation/verification
- `src/routes/api/public/a2a/message.ts` — A2A `message/send` JSON-RPC handler
- `src/lib/a2a.ts` — A2A envelope helpers
- `src/lib/ucp.ts` — UCP schema + signing helpers
- `src/lib/ap2.ts` — AP2 mandate EIP-712 helpers
- `src/lib/aisa.server.ts` — AIsa gateway helper (server-only)
- `src/components/gx/AgentNegotiation.tsx` — buyer/seller chat UI
- `src/components/gx/AgentChatBubble.tsx` — chat message component
- `src/routes/agent-negotiation.tsx` — negotiation route

### Edits
- `public/.well-known/agent-card.json` — add A2A fields
- `src/routes/api/public/agent-card.ts` — return A2A-compliant card
- `src/lib/spend-policy.ts` — add AP2 mandate serialization
- `src/components/gx/GxHome.tsx` — link to negotiation + UCP panels
- `src/components/dance/Header.tsx` — add negotiation nav in GX mode
- `src/lib/gx-mode.ts` — no change needed

## Secrets needed
- `AISA_API_KEY` — your AIsa API key, stored securely. We will request it via the secret form.
- No new Lovable Cloud or Supabase setup; the app stays single-page with public server routes.

## Technical approach
- All AI calls go through a server route using AIsa's OpenAI-compatible endpoint (`https://api.aisa.one/v1`) with `Authorization: Bearer ${process.env.AISA_API_KEY}`.
- Buyer and seller prompts are server-side system prompts. The client sends the conversation history and receives a streamed response.
- Agents emit structured tool calls / JSON outputs for catalog fetch, quote, and purchase; the UI renders the negotiation transcript and the final on-chain settlement.
- The A2A/UCP/AP2 endpoints are public (`/api/public/*`) so an external agent could discover and interact with the storefront without auth.

## Out of scope
- Full A2A streaming task lifecycle with persistent task storage.
- Production-grade AP2 mandate vault contract on Arc (we will sign/verify mandates in server logic; on-chain anchoring is a future sprint).
- Database persistence for chat history.
- Replacing the existing H2H/GX commerce flow.

## Success criteria
1. `/.well-known/agent-card.json` validates against A2A 0.3 agent card shape.
2. `/api/public/ucp/conformance/self-test` returns a 200 with valid UCP checkout/order schemas.
3. The negotiation UI shows a buyer agent and seller agent conversing, powered by AIsa.
4. A negotiated purchase still settles on Arc Testnet and shows a real transaction hash linked to Arcscan.
5. The existing H2H shop and GX purchase flow continue to work without regression.
