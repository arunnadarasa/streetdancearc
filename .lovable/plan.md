# Update README for GitHub

Refresh `README.md` so the GitHub repo accurately reflects the current state of the app after the latest GX/discovery/mobile work. Keep the existing tone and structure; do not rewrite from scratch.

## What gets updated

1. **Discovery API section**
   - Add a short paragraph under "Circle products used" or as a new "Agent Marketplace Discovery" subsection explaining that the buyer agent resolves payable services via Circle's public x402 Discovery API.
   - Mention the local fallback (`/api/public/x402/resources`) and the 5-minute server cache.
   - List the new public endpoint `/api/public/x402/resources` in the agent surface list.

2. **Public API surface**
   - Update the agent surface bullet list to include:
     - `x402/resources.ts` — StreetRail's own discovery resource
     - `arc-rpc.ts` — same-origin RPC proxy
     - `a2h/` endpoints if not already listed
   - Ensure endpoint paths match the actual `src/routes/api/public/` tree.

3. **Mobile UX**
   - Add a one-liner in the intro or routes section noting the hamburger navigation and responsive header.

4. **Balances**
   - Clarify that balances are read via ERC-20 `balanceOf` and displayed in normal human units, with the safety guard for 18-decimal RPC quirks.

5. **Token table accuracy**
   - Re-verify the USDC/EURC/cirBTC addresses and decimals against `src/lib/tokens.ts` and update if they drifted.

6. **Lessons learned**
   - Add a bullet about Discovery API shape drift / defensive normalisation.
   - Add a bullet about the 18-decimal USDC balance quirk and the `balanceOf` fix.

## Out of scope

- No new code files.
- No deployment or publish steps in this plan.
- Keep the existing local setup, scripts, and reference docs sections; only patch what changed.
