# Use the Alchemy Arc Testnet RPC

Today the app hardcodes the public Arc RPC (`https://rpc.testnet.arc.network`) in four places: the viem chain definition, the token helper, the UCP discovery endpoint, and the x402 purchase route. The Alchemy URL is more reliable and rate-limit friendly, but it embeds an API key, so it must not ship in the browser bundle.

## What I'll do

1. **Store the URL as a secret** named `ARC_RPC_URL` (Lovable rejects `VITE_*` names, so it can't be a build-time env var).
2. **Server code uses it directly** — the x402 purchase route and UCP discovery read `process.env.ARC_RPC_URL` inside their handlers, falling back to the public RPC if unset.
3. **Browser traffic goes through a same-origin proxy** so the Alchemy key is never exposed: a new `POST /api/public/arc-rpc` route forwards the JSON-RPC body to Alchemy and returns the response verbatim.
4. **Chain definition points at the proxy** — `src/lib/arc-chain.ts` and `src/lib/tokens.ts` use `/api/public/arc-rpc` in the browser, keeping chain id 5042002, USDC gas, 6 decimals, and the Arcscan explorer unchanged. Privy and viem read balances and send transactions through it exactly as before.
5. **Verify** — load the app, confirm balance reads still resolve and no request in the browser network log contains the Alchemy hostname or key.

## Technical notes

- The proxy only accepts POST with a JSON body and returns the upstream response; no logging of request bodies.
- Falls back to the public Arc RPC when `ARC_RPC_URL` is absent, so the app still boots with zero secrets.
- Discovery keeps advertising the public RPC hostname (it is a public capability document, not a call path).

## What I need from you

After you approve, I'll open a secure form to paste the Alchemy Arc Testnet URL.
