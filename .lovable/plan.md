# Fix the published StreetRail 500

## Diagnosis

**Do I know what the issue is?** Yes.

The published URL currently returns HTTP 500, and the latest production worker logs report:

```text
ReferenceError: exports is not defined
```

The Circle App Kit dependency chain imports `@coral-xyz/anchor`, including through Swap Kit and Unified Balance Kit. The existing Vite alias works in the local build but is not preventing the CommonJS-only code from reaching the deployed worker. This is a server bundle initialization failure; the Privy iframe warnings in preview are separate and do not cause this published-page 500.

## Plan

1. **Remove the crash path from the server bundle**
   - Stop importing `@circle-fin/swap-kit` and `@circle-fin/unified-balance-kit` from the server runtime.
   - Remove those two packages once no source imports remain, so the deploy bundler cannot include Anchor transitively.
   - Preserve the Circle Rails panel contract and use the existing live FX data plus a clearly marked unavailable/fallback balance state.

2. **Isolate nanopayments from page startup**
   - Audit `@circle-fin/x402-batching` separately because it also pulls Circle providers that import Anchor.
   - If it remains in the startup graph, replace its SDK calls with a deployment-safe adapter that returns the existing graceful fallback instead of importing the package. Keep the A2H accrual and Arc settlement flows unchanged.

3. **Simplify obsolete bundler workarounds**
   - Remove the Anchor alias/stub if no remaining dependency requires it.
   - Keep the SSR error wrapper and reporting in place so future deployment failures remain visible.

4. **Verify before republishing**
   - Confirm no source or generated server bundle contains Circle App Kit imports or unwrapped `exports` references.
   - Exercise `/`, `/shop`, `/moves`, `/markets`, `/deck`, and `/agent-negotiation` against the worker-compatible build.
   - Republish, then verify `https://streetrail.lovable.app/` returns 200 and fresh production logs no longer contain the ReferenceError.

## Scope

No visual redesign or commerce behavior changes. The priority is restoring the public site while retaining graceful status reporting for optional Circle SDK integrations.