# Fix the "Missing PRIVY_APP_ID" screen

## What I checked

- The Privy app ID secret **is** present in this environment, and the server-rendered homepage embeds it correctly (`privyAppId:"cmmv0z…"`).
- I loaded `/`, `/shop`, `/moves`, `/markets`, `/agent-negotiation` and `/deck` at 384px width, plus client-side navigation between them: none of them showed the missing-ID screen locally.
- The published address (`streetdancearc.lovable.app`) currently returns "No Lovable project found at this address" — nothing is published there right now.
- The gated preview URLs return 403 to my tools, so I could not read the exact build your phone loaded.

So the screen you hit is environment-specific: the app ID reached the browser here, but not on the build your phone was served. Today the ID has exactly one delivery path — a server function reading `PRIVY_APP_ID` at request time — and if that env var is empty in whichever worker serves the page, the whole app is replaced by the error screen.

## What to change

Make the app ID delivery resilient instead of single-path.

1. **Add a public build-time fallback.** The Privy app ID is a publishable value (it already ships to the browser today), so it can safely live in the client bundle. Read `VITE_PRIVY_APP_ID` in the Privy mount and use it whenever the loader value is empty.
2. **Keep the server secret as the primary source** — no change to `PRIVY_APP_ID` or the existing loader, so nothing regresses where it already works.
3. **Stop the error screen from replacing the whole page.** When no ID resolves, still render the site (header, merch, content) and show a small inline notice on the sign-in control only, instead of a full-screen takeover. A missing wallet key should never blank the storefront.
4. **Add a diagnostic line** to that notice (which source was tried) so a future occurrence is self-explanatory.

## Technical detail

- `src/components/privy-client-entry.tsx`: resolve `appId ?? import.meta.env.VITE_PRIVY_APP_ID`; when still empty, render `children` wrapped in a no-Privy context rather than the current full-screen block.
- `src/components/PrivyRoot.tsx`: unchanged mount pattern (ClientOnly + lazy) so SSR stays safe.
- `src/components/dance/Header.tsx`: sign-in button shows "Wallet unavailable" when no ID resolved.
- `VITE_PRIVY_APP_ID` gets set as a project secret with the same value as `PRIVY_APP_ID`.
- No change to routes, loaders, contracts, or the Arc RPC proxy.

## To confirm the root cause

If you can tell me the exact URL from that screenshot (published site vs preview), I can verify which environment is missing the value rather than only hardening against it.
