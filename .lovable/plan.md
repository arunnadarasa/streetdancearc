# Wire the Circle Agent Marketplace Discovery API

Today `src/lib/discovery.server.ts` already calls `GET https://api.circle.com/v2/x402/discovery/resources`, but the only place it surfaces is a single stat line in the Circle Rails panel ("N resources"). The agent run still starts from a hardcoded agent card. This plan turns discovery into a visible, working part of the GX story.

I verified the live endpoint returns real data (keyless, no API key): items carry `resource`, `accepts[]` (scheme / network / asset / payTo / amount) and `metadata.provider` (name, category, tags, description).

## What gets built

**1. A Discovery browser panel (agent's view of the marketplace)**
- New panel on the "agent negotiates" page listing live x402 resources from Circle's marketplace.
- Each row: provider name, description, category badge, network, asset, price (converted from atomic units), and a link to the resource.
- Filters: network (Arc Testnet / Base / all) and free-text search over provider, tags, and description.
- Shows a source badge — "live from Circle Agent Marketplace" vs "local fallback" — so it's honest when the API is unreachable.

**2. Discovery becomes step 0 of the agent run**
- Before hitting the agent card, the run logs a real `discovery` step: how many resources were returned, how many settle on Arc Testnet, and which one the agent selected (StreetRail's own `/api/public/purchase`, matched by network + scheme rather than hardcoded).
- If Circle is unreachable, the step degrades to the local fallback and says so instead of failing.

**3. StreetRail publishes itself in the discovery shape**
- New public endpoint returning StreetRail's merch checkout as a spec-shaped x402 resource item (`resource`, `accepts[]` with all three tokens, `metadata.provider`), so an external agent can consume us the same way we consume Circle.
- Linked from the agent card's endpoint list.

**4. Richer discovery data model**
- Extend the normaliser to keep `payTo`, `category`, `tags`, `scheme`, and `maxTimeoutSeconds`, and to expose every entry in `accepts[]` rather than only the first — that is what makes network filtering meaningful.

## Technical notes

- Data path: `src/lib/discovery.server.ts` (extended normaliser + filters) → a new `discovery.functions.ts` server function → the panel via TanStack Query. Server-side 5-minute cache stays.
- Keyless public API, so no secret is needed and nothing is added to the server env.
- New files: `src/lib/discovery.functions.ts`, `src/components/gx/DiscoveryPanel.tsx`, `src/routes/api/public/x402/resources.ts`.
- Edited: `src/lib/discovery.server.ts`, `src/components/gx/useAgentRun.ts`, `src/components/gx/AgentNegotiation.tsx`, `src/routes/api/public/agent-card.ts`.
- No database, no auth, no new dependencies. Existing dark street-dance token styling reused.

## Risks

- Circle's marketplace currently lists mostly Base/Polygon resources and may return zero Arc Testnet entries; the panel handles an empty Arc filter with an explicit empty state rather than looking broken.
- Response shape is undocumented and could drift; the normaliser stays defensive and falls back to the local resource on any parse failure.
