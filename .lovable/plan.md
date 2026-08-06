# Fix the broken build (Circle kits pull in Solana) + answer on Circle's starter kits

## Is the starter-kit repo useful?

`circlefin/agent-stack-starter-kits` is runnable examples wiring Circle Agent Stack into LangChain, Claude Agent SDK, OpenAI Agents SDK, Vercel AI SDK and Google ADK. For StreetRail it is useful as a *reference* — mainly to sanity-check our Agent Stack / x402 / Gateway call shapes and to name-drop conformance in the judges' deck. It is not useful as a base to adopt: those kits are Node processes with framework-specific agent runtimes, while StreetRail runs agent logic in Cloudflare Worker server functions and already implements discovery, nanopayments, unified balance and swap. Copying them in would add a second agent runtime for no judged benefit.

## The build is currently failing

`vite build` fails in the Worker (SSR) environment:

```text
"." is not exported under the conditions ["workerd","worker",...]
from node_modules/rpc-websockets
```

Cause, confirmed by inspection: `@circle-fin/swap-kit` and `@circle-fin/unified-balance-kit` (and the gateway provider used by `@circle-fin/x402-batching`) depend on `@solana/web3.js`, which depends on `rpc-websockets`. That package's `exports` map has no `workerd`/`worker` entry, so the Cloudflare-targeted bundle cannot resolve it. Dynamic `await import()` does not help — the Worker bundler still has to resolve and inline it.

StreetRail never touches Solana; the code paths that reach it are dead weight.

## Plan

1. Add a tiny local stub module (e.g. `src/lib/stubs/rpc-websockets.ts`) exporting the handful of symbols Solana's web3 client expects (`Client`, default export) as no-op throwers.
2. Alias `rpc-websockets` (and `rpc-websockets/dist/lib/client/websocket.browser` if it is also requested) to that stub in `vite.config.ts` via `resolve.alias`, so the Worker bundle resolves cleanly. No `ssr.external` — that is not allowed on this stack.
3. Rebuild and confirm the Worker environment compiles.
4. Smoke-check the Circle rails panel in the preview: unified balance, swap rate, and nanopayments batching should still return their real result or degrade to the documented fallback message. Arc settlement must be unaffected.

If the stub still leaves Solana code unresolvable, fall back to removing the three `@circle-fin/*` packages and calling the same Circle endpoints over plain `fetch` from the existing `*.server.ts` files — same product coverage, no Solana dependency tree.

## Technical notes

- Files touched: `vite.config.ts`, one new stub file. No change to `nanopay.server.ts` / `appkit.server.ts` logic in the primary path.
- Fallback path would rewrite `src/lib/appkit.server.ts` and `src/lib/nanopay.server.ts` to REST calls and drop `@circle-fin/swap-kit`, `@circle-fin/unified-balance-kit`, `@circle-fin/x402-batching` from `package.json`.
- Optional, separate: cite the starter-kit repo in the README's "Circle products used" table as the conformance reference.
