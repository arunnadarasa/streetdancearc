# Fix: published site returns 500 ("This page didn't load")

## What's happening

The live site at streetrail.lovable.app returns HTTP 500 on every request (your screenshot is our own SSR fallback page working as designed). The published worker logs show one repeated error:

```text
ReferenceError: exports is not defined
```

That is a CommonJS-only module ending up in the Cloudflare Worker bundle. The preview/dev server is fine (localhost returns 200), so this only affects the deployed build.

## What I verified

- Published URL: HTTP 500 on `/`; worker logs show `exports is not defined` on every request.
- Local dev server: HTTP 200.
- A fresh local production build (`vite build`) succeeds, and scanning the generated worker bundle finds **no** unwrapped `exports` reference — every CommonJS module is properly wrapped.

So the current source appears to build clean, and the live deployment is running older output. That is the leading hypothesis, not a confirmed root cause — step 1 tests it.

## Plan

1. **Republish from current source** and re-check the live URL plus worker logs. If the 500 clears, the stale-deploy hypothesis is confirmed and we stop here.
2. **If it still 500s**, the CJS module is being pulled in only by the deploy-side build. Then:
   - Reproduce against the exact deployed bundle and identify the offending package (most likely candidates are the Circle App Kits: `@circle-fin/unified-balance-kit`, `@circle-fin/swap-kit`, `@circle-fin/x402-batching`, or their `@base-org` / `@reown` / `@coinbase` transitive deps, which ship browser/CJS builds).
   - Fix by isolating that package from the SSR graph: keep its use behind an already-existing `await import()` inside a try/catch, and if that is not enough, replace the static dependency with a direct HTTPS call to the same Circle API (the kits are only used for balances/rates and already degrade to `available: false`).
   - Last resort: a Vite alias stub for the offending sub-dependency, the same pattern already used for `rpc-websockets`.
3. **Verify**: live URL returns 200, worker logs are clean, and the Circle Rails panel, A2H sweep, and x402 flows still render.

## Technical notes

- No app logic or UI changes are intended; this is a bundling/deploy fix.
- The SSR error wrapper (`src/server.ts`, `src/lib/error-capture.ts`) stays as-is — it is what surfaced the error, and it should keep doing so.
- If a package has to be dropped, the affected panel keeps its existing graceful "unavailable" state rather than disappearing from the demo.
