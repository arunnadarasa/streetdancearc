---
name: lovable-midnight
description: Ship a Midnight ZK dApp (Compact contract + Lace wallet + proof server + Indexer reads) in a single Lovable build, on either the public preview/preprod testnets OR a fully local standalone Docker stack (Undeployed). Use when the user asks for anything on the Midnight Network — private-by-default smart contracts, zero-knowledge circuits, Lace wallet, tDUST, "how do I add privacy to my app", or a hackathon demo that must run offline / on a laptop.
---

# lovable-midnight

Build a Midnight Network dApp in one shot. Midnight is a privacy-first L1 where every smart contract has a public ledger, a ZK circuit, and a local off-chain component. Circuit parameters are **private by default** — you must call `disclose()` to move any value to public state.

## Version source of truth

The official [Midnight Support Matrix](https://docs.midnight.network/relnotes/support-matrix) is the source of truth for all package versions. The snapshot below is current as of **2026-07-23**; if the matrix and this skill disagree, the matrix wins.

| Component | Public networks (Preview / Preprod / Mainnet) | Local Undeployed stack |
| --- | --- | --- |
| Midnight Node | 1.0.1 (Preview) / 1.0.0 (Preprod, Mainnet) | `midnight-node:0.22.5` |
| Midnight Indexer | 4.3.3 | `indexer-standalone:4.0.2` |
| Proof server | 8.1.0 | `proof-server:8.0.3` |
| Midnight.js (`midnight-js-*`) | 4.1.1 | 4.1.1 |
| Wallet SDK | 1.2.0 | 1.2.0 |
| DApp Connector API | 4.0.1 | 4.0.1 |
| Compact toolchain | 0.31.1 (pragma `0.23`) | 0.31.1 (pragma `0.23`) |
| Compact runtime | 0.16.0 | 0.16.0 |
| On-chain runtime | 3.0.0 | 3.0.0 |
| testkit-js | 4.1.1 | 4.1.1 |


## 2026-08 update — hard-won lessons from working agentic repos

These rules come from three end-to-end agentic-commerce dApps that reached real on-chain Undeployed anchors ([agenticmidnight](https://github.com/arunnadarasa/agenticmidnight) — AP2 `anchorMandate`, [ucpmidnight](https://github.com/arunnadarasa/ucpmidnight) — UCP `appendEntry`, [x402midnight](https://github.com/arunnadarasa/x402midnight) — x402 + Sepolia + EffectStream `anchorChunk`). Where they contradict older sections in this skill, **these rules win**. Skim this whole section before writing any deploy or server-append code.

### 1. Wallet / SDK stack MUST match the indexer

- Local Undeployed uses **`indexer-standalone:4.0.2`**. Pin the wallet stack to it: **`@midnight-ntwrk/wallet-sdk@1.2.0`** + **`@midnight-ntwrk/testkit-js@4.1.1`** + `midnight-js-*@4.1.1`. Use `MidnightWalletProvider` (from wallet-sdk) or the testkit `WalletFacade`, not `WalletBuilder.buildFromSeed` from `@midnight-ntwrk/wallet@5`.
- `@midnight-ntwrk/wallet@5.0.0` `WalletBuilder` speaks a newer GraphQL schema. Against indexer 4.0.2 every subscribe dies with `Unknown field "wallet" on type "Subscription"` / `Unknown type "ProgressUpdate"` / `"ViewingUpdate"`. Do NOT use wallet@5 for Undeployed until the indexer catches up.
- Node deploy scripts must polyfill WebSocket: `import WebSocket from 'ws'; (globalThis as any).WebSocket = WebSocket;`.
- `NetworkId` from `@midnight-ntwrk/midnight-js-network-id` is **type-only** at 4.1.1 — it is NOT a runtime enum. Use `setNetworkId("undeployed")` with a string literal. The wallet-side runtime enum lives on `wallet-sdk` under a nested namespace: `NetworkId.NetworkId.Undeployed`. Fly.io faucets on Bun crash importing this package's ESM entry — pass the numeric enum (`0` for Undeployed) or the string name directly.
- Compact 0.31 emits ESM `contracts/managed/<name>/contract/index.js`. Deploy scripts must resolve `.js` first with `.cjs` only as fallback — hard-coding `index.cjs` breaks with `MODULE_NOT_FOUND`.
- Every Node-side deploy import must be in `package.json` (Vite resolution does not carry into scripts). Minimum `bun add` for a working deploy: `@midnight-ntwrk/midnight-js-contracts@4.1.1`, `@midnight-ntwrk/midnight-js-node-zk-config-provider@4.1.1`, `@midnight-ntwrk/midnight-js-level-private-state-provider@4.1.1`, `@midnight-ntwrk/midnight-js-http-client-proof-provider@4.1.1`, `@midnight-ntwrk/midnight-js-indexer-public-data-provider@4.1.1`, `@midnight-ntwrk/midnight-js-utils@4.1.1`, `@midnight-ntwrk/wallet-sdk@1.2.0`, `@midnight-ntwrk/testkit-js@4.1.1`, `@midnight-ntwrk/zswap@4.0.0`, `ws`.

Deploy skeleton (replaces the older `WalletBuilder` skeleton further down; keep gotchas ①–⑨):

```ts
import WebSocket from "ws";
(globalThis as any).WebSocket = WebSocket;

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-contracts";
import { MidnightWalletProvider } from "@midnight-ntwrk/wallet-sdk";
// ...zk / private-state / proof / indexer providers as before

setNetworkId("undeployed"); // string, NOT NetworkId.Undeployed

const wallet = await MidnightWalletProvider.create({
  networkId: "undeployed",
  seedHex: GENESIS_SEED, // "…0002" — see gotcha ③ below
  indexerUrl: process.env.VITE_INDEXER_URL!,
  indexerWsUrl: process.env.VITE_INDEXER_WS_URL!,
  proofServerUrl: process.env.VITE_PROOF_SERVER_URL!,
  nodeUrl: "ws://localhost:9944",
});
await wallet.start(true); // DUST-aware sync
// ...providers bag + CompiledContract.make(...).withWitnesses(...).withCompiledFileAssets(...)
```

### 2. Design deploy for server-append from day ONE (Undeployed non-negotiable)

Lace cannot sign on Undeployed. Every write path on Undeployed must go through a server route that reuses the genesis wallet. In Lovable / TanStack Start that means:

```text
Undeployed:  UI → POST /api/public/<verb> → genesis wallet (server) → chain
Preview/Preprod/Mainnet:  UI → Lace publishKit → chain
Reads on every network:  indexer GraphQL, no wallet needed
```

To make server-append actually reload the deploy-time witness (i.e. avoid `RpcError 117` "cannot find private state"), everything the deploy step touched MUST be reconstructable at append time. Put these in a **shared** module (`src/lib/midnight-shared.ts` — imported by both `scripts/deploy-midnight.mjs` and every `*.server.ts` file):

- `GENESIS_SEED = "…0002"` — the standalone chain funds this seed, NOT `…0001`.
- `PRIVATE_STATE_ID` — a **stable** string, e.g. `"agentic-mandate-v1"`. Never `Date.now()`.
- `PRIVATE_STATE_STORE` — the LevelDB store name (both deploy and server MUST open the same one).
- `PRIVATE_STORAGE_PASSWORD` — same on both sides; ≥3 char classes.
- `DEPLOYER_SECRET_HEX` — **deterministic** 32-byte hex, NOT `crypto.getRandomValues`. Otherwise server-append cannot re-derive the witness.
- Deterministic buyer/merchant public key: `persistentHash<Vector<2, Bytes<32>>>([pad(32, "<domain>:v1"), sk])`. Domain per protocol: `ap2:buyer:v1`, `ucp:merchant:v1`, `musdc:signer:v1`, `abodc:author:v1` — never reused across protocols.

Persist deploy output to `src/data/midnight-contract.undeployed.json`:

```json
{ "contractAddress": "…", "deployTxId": "…", "privateStateId": "agentic-mandate-v1", "buyerPk": "…", "deployedAt": "…" }
```

Every server route MUST call `providers.privateStateProvider.setContractAddress(contractAddress)` **before** any `get`/`set` — omitting it is the most common cause of a 500 with "Contract address not set".

`levelPrivateStateProvider` at 4.1.1 no longer accepts `{ privateStateStoreName: "…" }` alone. It requires a **function** password provider and an `accountId`: `levelPrivateStateProvider({ privateStateStoreName, accountId, privateStoragePasswordProvider: { get: async () => PASSWORD } })`. The `{ get: async () => … }` shape on the outer providers bag from older skeletons is outdated for 4.1.1.

### 3. `midnightSsrStub()` MUST be gated with `apply: "build"`

Escalated to a top-level rule. Any Vite plugin that swaps `@midnight-ntwrk/*` or `*.server.ts` files for stubs must include `apply: "build"`. Without it, `vite dev` API handlers hit the stub, `/api/public/<verb>` silently returns `{ simulated: true, midnightTxHash: "0xSIMULATED" }`, and the UI shows "ANCHORED" for a transaction that never happened. The production Cloudflare Worker build still gets the stub; local dev keeps the real Midnight Node modules.

```ts
function midnightSsrStub(): Plugin {
  return {
    name: "midnight-ssr-stub",
    enforce: "pre",
    apply: "build",                // ← MANDATORY, not optional
    async resolveId(id, importer, options) { /* … */ },
  };
}
```

Any server route that silently returns a fake tx hash on `simulated: true` should be re-audited to **fail loudly** when the contract-address JSON is missing or `VITE_NETWORK_ID !== "undeployed"`. Do NOT ship a "successful" UI state that reads `midnightTxHash: "0xSIMULATED"` — always verify via the indexer.

### 4. `optimizeDeps.exclude` — full list

`testkit-js` and `wallet-sdk` pull in Node-only transitives (`pino`, `ws`, `ssh2`, `cpu-features`) that hang the Vite dev server on "Loading…" if pre-bundled. Ship these excludes from day one:

```ts
optimizeDeps: {
  noDiscovery: true,
  exclude: [
    "@midnight-ntwrk/testkit-js",
    "@midnight-ntwrk/wallet-sdk",
    "@midnight-ntwrk/midnight-js-contracts",
    "@midnight-ntwrk/midnight-js-http-client-proof-provider",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider",
    "@midnight-ntwrk/midnight-js-node-zk-config-provider",
    "@midnight-ntwrk/midnight-js-level-private-state-provider",
    "@midnight-ntwrk/midnight-js-network-id",
    "@midnight-ntwrk/midnight-js-utils",
    "@midnight-ntwrk/wallet",
    "@midnight-ntwrk/compact-runtime",
    "@midnight-ntwrk/onchain-runtime-v3",
    "pino", "ws", "ssh2", "cpu-features",
  ],
}
```

### 5. Compact-side gotchas

- `pad(32, "<domain>:<role>")` — the string must be **≤ 32 UTF-8 bytes** or Compact refuses to compile with `cannot pad "…" to length 32 since its utf8-equivalent already exceeds that length`. Keep domain separators short (`ap2:buyer:v1`, `ucp:merchant:v1`, `musdc:signer:v1`, `abodc:author:v1`). Never use a full product name.
- `Opaque<"string">` ledger fields **cannot** be initialised in `constructor()` with a string literal like `"(empty)"` — literals are `Bytes<N>`. Drop the init and let the field start uninitialised; guard reads in the circuit.
- Any Compact-side signing key that a TypeScript witness will re-derive later MUST use the **exact** byte layout the circuit expects: `persistentHash<Vector<2, Bytes<32>>>([pad(32, "<domain>:v1"), sk])` — no extra fields, no reordered inputs, no different arity.

### 6. React "Page Unresponsive" on wallet-connect panels

Symptom: main thread dies as soon as you click "Connect Lace"; Chrome shows a "Page Unresponsive" dialog. It is NOT a Lace bug — it is a `setState`-during-render loop in the wallet-bubble component. Rule: never call `onChange(walletState)` inside the component body. Bubble state upward from a `useEffect` only.

### 7. Definition of done for Undeployed — verify with the indexer, not the SDK

Before polishing UI, POST to the indexer:

```graphql
query($addr: HexEncoded!) {
  contractAction(address: $addr) {
    ... on ContractCall {
      entryPoint
      transaction { hash block { height } }
    }
  }
}
```

Confirm `entryPoint` matches the circuit you called (`anchorMandate`, `appendEntry`, `anchorChunk`, …) and a non-null block height. midnight-js `txId` returned by `callTx.…` and the indexer's `transaction.hash` are **different strings** — do not string-match one against the other. The indexer's ledger hash is the source of truth for "anchored".

After every `midnight:down` → `midnight:up`: **redeploy the contract AND restart Vite**. The LevelDB store is wiped, the previous contract address no longer exists, and Vite's cached module graph still holds the old `ctxPromise`. Both must be reset together.

### 8. EffectStream / dual-rail (Sepolia → Undeployed) overlay

From x402midnight: Sepolia Circle assets (USDC/EURC/cirBTC) never move to Midnight. EffectStream is a **sync/overlay** that anchors a chunk hash on the Undeployed `StreamingChoreographyIP` contract after the Sepolia payment settles. Do NOT describe this as bridging. Rules for the pattern:

- **x402 multi-accept.** The 402 challenge advertises every viable rail at once: `midnight-mUSDC` plus Sepolia `exact` options on `eip155:11155111` for USDC / EURC / cirBTC.
- **Decimals differ per asset.** USDC = 6, EURC = 6, cirBTC = 8. Ship a `priceMicroUsdToTokenAtomic(asset, priceMicroUsd)` helper — never hardcode `10**6`.
- **Sepolia rail traps that eat hours** (from x402midnight):
  - Foundry `forge create` silently dry-runs unless `--broadcast` appears in the correct position. Always confirm the receipt on the block explorer; a success message alone is not evidence of an on-chain deploy.
  - Etherscan V1 per-chain hosts (`api-sepolia.etherscan.io`) are deprecated. Verify with V2: `--verifier-url https://api.etherscan.io/v2/api?chainid=11155111 --skip-is-verified-check`. A valid V2 key can pass balance pings and still fail V1-style ABI preflight.
  - Infura rejects gas > 2²⁴ (16 777 216). When `eth_estimateGas` fails (usually zero token balance or missing allowance) MetaMask falls back to 21 000 000 and Infura returns `transaction gas limit too high (cap: 16777216, tx: 21000000)`. This looks like a contract revert in viem's error wrapping; it isn't. Surface `balance >= required` and allowance state BEFORE calling `writeContract`, with a `faucet.circle.com` CTA.
- **`/api/public/sepolia-fulfill` must fail loudly.** If the SCIP contract address JSON is missing or `VITE_NETWORK_ID !== "undeployed"`, return an HTTP 4xx/5xx error, NOT `{ midnightTxHash: "0xSIMULATED" }` with `success: true`. A UI that reads "ANCHORED" from `0xSIMULATED` is a bug, not a demo mode.
- **Two networks, two wallets.** Sepolia → MetaMask + Circle tokens. Undeployed writes → server genesis wallet + local proof server. Never conflate them; never force Lace for Undeployed settlement.

### 9. Canonical file layout the three repos converged on

```
src/lib/midnight-shared.ts             # seed, private-state id/store/password, deployer secret, domain sep
src/lib/midnight-providers.server.ts   # shared Undeployed providers bag (wallet + zk + priv-state + proof + indexer)
src/lib/<verb>.server.ts               # findDeployedContract + callTx.<verb>(args) — one per circuit entry point
src/lib/<verb>.ssr-stub.ts             # inert stub for Cloudflare production build only
src/routes/api/public/<verb>.ts        # POST handler — on Undeployed calls the .server.ts; other nets return 501 or defer to Lace client-side
src/data/midnight-contract.undeployed.json  # deploy metadata (address, tx, privateStateId, buyerPk)
scripts/midnight-standalone.mjs        # writes .midnight/standalone.docker-compose.yml with the full APP__INFRA__ env
scripts/deploy-midnight.mjs            # MidnightWalletProvider + CompiledContract.make; writes the JSON above
```

### 10. Failure modes added by this update

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Unknown field "wallet" on type "Subscription"` from any deploy or provider | `@midnight-ntwrk/wallet@5` against indexer-standalone `4.0.2` | Downgrade to `MidnightWalletProvider` + `wallet-sdk@1.2.0` + `testkit-js@4.1.1` |
| Indexer container exits at boot with `missing field 'secret' for key "INFRA"` | Compose only sets `APP__INFRA__NODE__URL` | Adopt the full `midnight-local-dev/standalone.yml` env block (with `APP__INFRA__SECRET`) |
| Compact refuses to compile: `cannot pad "<long>:author:" to length 32` | Domain-separator string is > 32 UTF-8 bytes | Shorten to `<abbrev>:<role>:v1` (e.g. `abodc:author:v1`) |
| Compact refuses to compile: `disclose("(empty)")` on an `Opaque<"string">` field | String literals are `Bytes<N>`, not `Opaque` | Drop the constructor init; let the field start uninitialised |
| Deploy fails with `MODULE_NOT_FOUND` on `.../contract/index.cjs` | Compact 0.31 emits ESM `index.js` | Resolve `contract/index.js` first, `.cjs` only as fallback |
| `NetworkId is not defined` at runtime after `import { NetworkId } from "@midnight-ntwrk/midnight-js-network-id"` | It's a TYPE-only export in 4.1.1 | `setNetworkId("undeployed")`; use `wallet-sdk`'s `NetworkId.NetworkId.Undeployed` when a runtime enum is needed |
| `/api/public/<verb>` always returns `simulated: true` in dev | `midnightSsrStub()` runs on all SSR including local API routes | Gate the plugin with `apply: "build"` |
| Server-append fails with RpcError 117 / "cannot find private state" | `DEPLOYER_SECRET_HEX`/`privateStateId`/store name/password differ between deploy and server | Move them all to `src/lib/midnight-shared.ts`; both sides import the same constants |
| POST to indexer `/api/v4/graphql` returns 405 | Used GET | GraphQL requires POST |
| Wallet-connect panel triggers Chrome "Page Unresponsive" | Parent `setState` called during render in the wallet-bubble component | Bubble wallet state via `useEffect` only |
| UI shows "ANCHORED" but the tx hash is `0xSIMULATED` | Server route silently returned a fake hash | Fail loudly when SCIP JSON is missing or network isn't Undeployed; verify with indexer `contractAction` |
| Etherscan verify fails with `Invalid API Key` on a working key | Foundry hit the deprecated V1 host | `--verifier-url https://api.etherscan.io/v2/api?chainid=<id> --skip-is-verified-check` |
| Sepolia tx errors with `transaction gas limit too high (cap: 16777216, tx: 21000000)` | `eth_estimateGas` failed (usually 0 balance / no allowance) → MetaMask fell back to 21M → Infura's 2²⁴ cap | Fund the wallet / approve the token first; surface balance vs required BEFORE `writeContract` |
| `forge create` "succeeded" but nothing on the explorer | Missing or misplaced `--broadcast` | Always add `--broadcast` and check the block explorer receipt |



| Target | Use when | Wallet | Node/Indexer | Proof server |
| --- | --- | --- | --- | --- |
| **Undeployed / local standalone** | Hackathon, offline demo, no faucet dance, deterministic funding | Deploy script uses a genesis-funded seed; UI can still connect Lace on `undeployed` | Local Docker (`midnight-node:0.22.5` + `indexer-standalone:4.0.2`) | Local Docker (`proof-server:8.0.3`) |
| **Undeployed hosted on Fly.io** | Published Lovable demo any visitor can test with their own Lace | Same seed for deploy; visitors get tDUST from an in-app faucet button | 3 Fly apps (`choreo-node` internal-only, `choreo-indexer` public, `choreo-proof` public) | Same `choreo-proof` app |
| **Preview** (unstable, resets) | Sharing a preview link with real Lace users | Lace on Preview | Hosted by Nethermind | Local Docker (`proof-server:8.1.0` from matrix) or `cfg.proverServerUri` |
| **Preprod** (stable) | Anything demoed to real users, near-mainnet | Lace on Preprod | Hosted by Nethermind | Local Docker (`proof-server:8.1.0` from matrix) or `cfg.proverServerUri` |

For a hackathon under a deadline, **default to local Undeployed**. When you're ready to ship a public demo, promote to **Undeployed hosted on Fly.io** (below) rather than fighting the preview/preprod faucet flow — same NetworkId, same seed logic, same Lace UX.

## Fly.io hosted stack (public demo)

Goal: `published-site.lovable.app` works for any visitor with Lace, without them running Docker. Four Fly apps in one org/region:

```text
choreo-node.internal:9944    # midnight-node:0.22.5, 6PN-internal, 1× machine, 1GB volume
choreo-indexer.fly.dev       # indexer-standalone:4.0.2 -> ws://choreo-node.internal:9944
choreo-proof.fly.dev         # proof-server:8.0.3, memory=2gb (proving key needs ~1.5GB), min_machines_running=1
choreo-faucet.fly.dev        # Node.js @midnight-ntwrk/wallet, holds FAUCET_SEED, /grant endpoint
```

Non-negotiables specific to this topology:

- **`midnight-node:0.22.5` on Fly does NOT self-author blocks — this is the #1 blocker.** `CFG_PRESET=dev` + `SIDECHAIN_BLOCK_BENEFICIARY` boots the node in partner-chain follower mode; without a Cardano follower it sits at `best: #0` forever, logs `Failed to trigger bootstrap: No known peers`, and every downstream service (indexer stays empty, faucet wallet never syncs, deploy script times out with `Insufficient Funds`). The "standalone dev chain" recipe from `docker-compose` does NOT translate 1:1 to Fly — the local compose works because the image sees a specific env combination the Fly `[env]` block does not reproduce. **Before promoting to Fly, `flyctl ssh console -a choreo-node` into the machine and dump the image's `/entrypoint.sh` (or `docker inspect midnightntwrk/midnight-node:0.22.5`) to learn which env vars/flags actually enable standalone sealing for the tag you pinned.** Verify with `flyctl logs -a choreo-node | grep -E "Prepared block|Imported #[1-9]"` — if you never see block imports past #0, don't waste hours on indexer/faucet debugging; it's the node.
- **Do NOT overwrite the image entrypoint with `[processes] app = "..."`.** Fly interprets `[processes]` as the container CMD, which is passed as extra args to the image ENTRYPOINT. Small extra flags (`--rpc-external`) are fine; a full command replaces the preset logic and gives you a silent misconfiguration. If you need to change flags, prefer image env vars first (`RPC_LISTEN_ADDR`, `CFG_PRESET_EXTRA_ARGS`, whatever the entrypoint script reads) — inspect the entrypoint before guessing.
- **Single machine per app.** Midnight standalone node is stateful (same rule as Canton — see `canton-fly-deploy`). `flyctl scale count 1` on every app, `min_machines_running=1` on node and proof-server, `auto_stop_machines=false` on the node.
- **Node is never public.** No `[http_service]` on `fly/node/fly.toml`. Indexer and deploy script reach it via the internal `.internal` DNS name over 6PN. Exposing 9944 publicly leaks the raw RPC. Bind the RPC endpoint to `[::]:9944` inside the node so the IPv6-only 6PN network can reach it.
- **Indexer must bind to IPv6.** Fly's 6PN is IPv6-only. Set `APP__INFRA__API__ADDRESS = "::"` (bare, NOT `"[::]"` — TOML parses the bracketed form as a sequence and the container crashes at boot). Then `choreo-indexer.internal:8088` becomes reachable from the faucet and deploy machine.
- **Proof-server does NOT need dual-stack.** Earlier versions of this skill recommended wrapping the stock binary with a `socat` IPv6 proxy in a custom Dockerfile. Skip that entirely: the proof server is only ever accessed via the public `https://choreo-proof.fly.dev`, which enters the machine over IPv4 through Fly's edge proxy. Use the stock image directly (`[build] image = "midnightntwrk/proof-server:8.0.3"`) with `[processes] app = "midnight-proof-server -v"`. The distroless base image has no `bash`/`sleep`/`chmod`, so any custom Dockerfile with an entrypoint script fails with `exec: 127` — don't go there.
- **Proof-server RAM ≥ 2 GB.** 1 GB OOMs during proving-key load and the visitor sees a truncated proof error. Cold start is still ~4 min the first mint after a deploy — same skill rule as local.
- **Indexer path is `/api/v4/graphql`.** The `indexer-standalone:4.0.2` image exposes v4. `/api/v1/graphql` emits a 308 redirect loop on the public fly.dev URL; always use v4. Env: `VITE_INDEXER_URL=https://choreo-indexer.fly.dev/api/v4/graphql`, `VITE_INDEXER_WS_URL=wss://choreo-indexer.fly.dev/api/v4/graphql/ws`.
- **Deploy from a 6PN Fly Machine, not the Lovable sandbox.** The deploy script needs `ws://choreo-node.internal:9944`, which is only reachable from inside 6PN. Pattern: build a tiny image with `bun scripts/deploy-midnight.mjs` + compiled artefacts, `flyctl deploy --build-only --push`, then `flyctl machine run <image> -a choreo-node --rm ...`. Attaching to any of the four apps in the same org joins 6PN automatically.
- **Contract address is tied to the node volume.** If you `flyctl volumes destroy chain_data`, every previously-deployed contract address is dead — you must re-run the deploy script and re-set `VITE_DEFAULT_CONTRACT`.
- **Faucet cannot run on Cloudflare Workers.** `@midnight-ntwrk/wallet` uses WebSocket + WASM patterns that workerd rejects. Host it on Fly as a fourth app (`choreo-faucet`) with a small `http.createServer` handler, expose `/grant { address }` with in-memory rate-limiting, and store `FAUCET_SEED` as a Fly secret. **Bind the HTTP server to `0.0.0.0`, NOT `::`** — Fly-proxy forwards inbound requests to the machine over IPv4 loopback; an IPv6-only listener never receives them and the app looks hung. (The wallet's *outbound* connections to `choreo-node.internal` still go over IPv6 — that's independent of the listen socket.)
- **`FAUCET_SEED` must be 64 hex chars.** `WalletBuilder.buildFromSeed` throws `InvalidSeed` on anything else. Use `openssl rand -hex 32`, not `openssl rand -base64 32`.
- **Faucet cannot import `NetworkId` from `@midnight-ntwrk/midnight-js-network-id` at Bun runtime** — the package's ESM entry crashes with an import-map error. Pass the numeric enum value directly (`0` for Undeployed) or hard-code the network name string.
- **Faucet cold-boot.** `wallet.start()` takes 10–90s to sync a non-zero balance after machine start; the `/grant` endpoint must return `503 warming up` until then and the UI must retry. Never set `min_machines_running=0` on `choreo-faucet` unless you accept a 90-second first-request delay. If the node is stuck at block #0, cold-boot never ends — check node health FIRST.
- **Faucet must be funded once.** Send tDUST from the genesis deployer wallet (seed `…0002`) to the address the faucet prints on boot. Refill when it runs dry — no auto-refill loop.
- **CORS on the faucet.** Set `Access-Control-Allow-Origin: *` (or your Lovable domain) plus `OPTIONS` handler, or the browser POST from `WalletConnectPanel` fails silently with a network error.
- **Cost:** ~$15–25/mo for the four always-on machines (proof-server is the biggest at 2GB shared-cpu-2x). Faucet can `auto_stop_machines=suspend` to save a few dollars, at the cost of the first grant per idle period taking ~90s.

### Bring-up order (do NOT skip step 1)

1. **Prove the node authors blocks.** Before deploying indexer/faucet/proof: `flyctl deploy` just the node, then poll `flyctl logs -a choreo-node | grep -E "Imported #[1-9]"` for 2 minutes. If you never see a non-zero import, stop and fix the node's entrypoint env — everything downstream depends on it and debugging looks like an indexer/faucet problem.
2. Deploy indexer, verify `curl -X POST https://choreo-indexer.fly.dev/api/v4/graphql -d '{"query":"{block(offset:{height:1}){height}}"}'` returns a non-null block.
3. Deploy proof-server, verify `curl https://choreo-proof.fly.dev/version` returns `8.0.3`.
4. Deploy faucet, poll `/health` until `{"ok":true,"address":"mn_addr_undeployed1..."}`.
5. Fund the faucet address once from the genesis deployer.
6. Run `scripts/fly-deploy-contract.sh` to deploy the contract from a 6PN machine, paste the printed address into `VITE_DEFAULT_CONTRACT`.


### Bootstrap flow (one-shot, idempotent)

```bash
export FLY_API_TOKEN=FlyV1...
export FAUCET_SEED=$(openssl rand -hex 32)   # save this
export FLY_ORG=personal
./scripts/fly-bootstrap.sh                    # creates 4 apps, volume, deploys, scales to 1
./scripts/fly-deploy-contract.sh              # ephemeral 6PN machine runs deploy-midnight.mjs
# Paste printed contract address into VITE_DEFAULT_CONTRACT (Lovable env vars) and republish.
```

Every step is 409-tolerant — safe to re-run after a redeploy or config change.

### Failure modes specific to Fly

| Symptom | Cause | Fix |
| --- | --- | --- |
| Indexer container restarts with `dial tcp: lookup choreo-node.internal: no such host` | Indexer app not in the same org as node (or 6PN not joined) | Create both under the same `--org`, and verify with `flyctl ips private -a choreo-indexer` |
| Proof-server OOMs mid-mint, first mint after deploy fails | 1GB machine — proving key needs 1.5GB | `[[vm]] memory = "2gb"`, redeploy |
| Faucet returns 503 for 60+ seconds after a redeploy | Wallet still syncing — expected | UI retry loop + "faucet warming up" toast; don't `min_machines_running=0` |
| Faucet returns 500 `Insufficient Funds` | Faucet wallet drained | Send more tDUST from the genesis deployer to the faucet's address (visible at `/health`) |
| Browser: `Mixed content: HTTPS page requested http://` | Env still points at `http://...localhost:6300` | Use the `https://choreo-proof.fly.dev` URL; Fly terminates TLS on 443 |
| Deploy script from Lovable sandbox: `WebSocket connection to 'ws://choreo-node.internal:9944' failed` | Sandbox is not on 6PN | Use `scripts/fly-deploy-contract.sh` — never run the deploy script from the Lovable sandbox or a local laptop that isn't a Fly Machine |
| `flyctl secrets set` fails silently in bootstrap | `FAUCET_SEED` not exported before running | Export it in the same shell, re-run the bootstrap (it re-uses existing apps) |
| Second flyctl `apps create` returns error even though app exists | Some flyctl versions exit 1 on 409 | Bootstrap script uses `flyctl apps list --json` grep first — do the same for any new create step |
| Two node machines materialise after a `flyctl deploy` | `--ha=true` (default) | Always `--ha=false` and `flyctl scale count 1` on the node app |
| Indexer public URL returns a 308 chain (`/api/v1/graphql` → `/api/v4/v1/graphql`...) | `indexer-standalone:4.0.2` serves GraphQL on `/api/v4/graphql` | Update all endpoints (faucet, deploy, frontend) to use `/api/v4/graphql` |
| `Connection refused` / `dial tcp ... choreo-indexer.internal:8088` from another Fly app | Service bound to IPv4; Fly 6PN is IPv6-only | Set `APP__INFRA__API__ADDRESS = "::"` (bare, no brackets) for indexer; bind faucet outbound wallet to `.internal` names (they resolve to IPv6 automatically); do NOT wrap proof-server — it doesn't need 6PN |
| Node stays at `best: #0` forever, `Failed to trigger bootstrap: No known peers` | `midnight-node:0.22.5` on Fly with `CFG_PRESET=dev` is running as a partner-chain follower without a Cardano source, not a self-sealing dev chain | `flyctl ssh console -a choreo-node` and read `/entrypoint.sh` to find the real "standalone sealer" env combination for the tag; don't assume the local `docker-compose` env is enough. This blocks the indexer, faucet, and deploy script — fix here first |
| Faucet `/health` returns `{"ok":false,"address":null}` for >5 min | Almost always: the node is stuck at #0 (previous row), NOT a faucet bug | Check `flyctl logs -a choreo-node` first; only investigate the faucet after you see block imports past #0 |
| Faucet HTTP requests hang / never reach the container | Server bound to `::` — Fly-proxy forwards over IPv4 loopback | Bind `http.createServer` to `"0.0.0.0"`. The wallet's outbound connections still use IPv6 because `.internal` names resolve to IPv6 |
| Faucet crashes at boot with `InvalidSeed` | `FAUCET_SEED` not exactly 64 hex chars (base64 output is common cause) | `flyctl secrets set FAUCET_SEED=$(openssl rand -hex 32) -a choreo-faucet` |
| Faucet crashes at boot importing `NetworkId` from `@midnight-ntwrk/midnight-js-network-id` | Package's ESM entry breaks under Bun runtime | Use the numeric enum directly (`0` for Undeployed) instead of importing the enum |
| Indexer container exits at boot with a TOML/env parse error | `APP__INFRA__API__ADDRESS = "[::]"` — the brackets make it a TOML sequence | Change to bare `"::"` |
| Custom proof-server Dockerfile fails to build with `exec: chmod not found` / `exec: 127` / `sleep: not found` | The stock `midnightntwrk/proof-server:8.0.3` base is distroless — no shell, no coreutils | Don't build a custom image. Use the stock image directly and set `[processes] app = "midnight-proof-server -v"`; drop the socat/entrypoint idea, the proof server is only public-facing so IPv4 is enough |
| Node running `[processes] app = "some-long-command"` behaves as if env vars are ignored | `[processes]` replaces CMD, gets appended to ENTRYPOINT — a long "command" here becomes stray args, not a new command | Keep `[processes]` short (or omit entirely); inspect the image entrypoint before adding flags; prefer env vars the entrypoint script actually reads |
| `flyctl logs` returns `Error: 401 Unauthorized` mid-session | Corrupted / retyped `FLY_ACCESS_TOKEN` (a single flipped char kills the whole macaroon) | Re-export the token verbatim from the source; never hand-retype it |
| Proof server unreachable on `choreo-proof.internal:6300` | Proof server binary listens on IPv4 only | Use a custom Dockerfile with a static socat proxy (TCP6-LISTEN with `ipv6-v6only=0`) |



## Non-negotiables

- **Compact language `0.23`** (toolchain 0.31.1), MidnightJS `midnight-js-*@4.1.1`, Wallet SDK `1.2.0`, DApp Connector API `4.0.1`, testkit-js `4.1.1`, `midnight-js-utils` (for `ttlOneHour`). Cross-check the matrix.
- Every `.compact` file starts with `pragma language_version 0.23;` and imports `CompactStandardLibrary`.
- Every ledger write from a circuit parameter needs `disclose(...)` — the whole privacy model.
- `witness` callbacks return values that never touch the chain. Never send the witness value in a transaction.
- Circuits are bounded: no recursion, no dynamic-length loops, no I/O, no oracles.
- Proofs on medium circuits (`k=13`–`k=14`, ~4k–8k rows) take **30–120s warm** on the local proof server, and **up to ~4 minutes cold** on a laptop. The cold path is dominated by the proof server lazy-loading the proving key (hundreds of MB) into RAM and JITing the WASM runtime on the first call after `docker compose up`, not by the circuit itself. One user-visible "Mint" can trigger **two back-to-back proofs**: the app's `midnight-js-contracts` prove pass, then Lace's own re-prove of the balanced tx before signing. Every write UI must show a `Proving…` state with an explicit "up to ~4 min on first mint" hint and stay usable — never add a spinner timeout under 5 minutes. To demo on video, run one warm-up mint off-camera first; warm proofs drop to ~30–60s. macOS Docker Desktop adds ~20–30% overhead vs native Linux because everything runs inside a Linux VM.
- **No SSR for the write path.** MidnightJS uses `window`, `Buffer`, and WASM top-level-await. Load `@midnight-ntwrk/*` behind a client-only boundary; put `import { Buffer } from 'buffer'; (globalThis as any).Buffer = Buffer;` as the FIRST line of `src/main.tsx` (Vite SPA) or of the client-only entry.
- **Do NOT** attempt Ethereum bridging, oracle calls inside circuits, or sub-second UX.

## Do NOT use these Docker images

- `midnightntwrk/midnight-node:latest` — **the `latest` tag does not exist**. Pull fails.
- `midnightntwrk/midnight-node:2.x` (partner-chain builds) — requires a Cardano follower + Postgres + `mock_registrations_file`. You'll chase config errors (`db_sync_postgres_connection_string must be defined`, then `mock_registrations_file must be defined`) forever. Not viable for a standalone hackathon.
- `midnightntwrk/indexer-standalone:latest` — pin an exact version.
- `midnightntwrk/proof-server:latest` — use the matrix tag for public networks (currently `8.1.0`) or the local-dev tag for Undeployed (`8.0.3`).

**Local Undeployed / Fly.io stack** — exact tags from the official `midnight-local-dev` repo (not covered by the public matrix):

```
midnightntwrk/proof-server:8.0.3
midnightntwrk/midnight-node:0.22.5
midnightntwrk/indexer-standalone:4.0.2
```

**Public Preview / Preprod** — use the matrix proof server tag: `midnightntwrk/proof-server:8.1.0`.

## Local standalone stack (Undeployed) — canonical `docker-compose.yml`

**IMPORTANT (2026-08 update from agenticmidnight / ucpmidnight / x402midnight).** Earlier versions of this skill shipped a compose block that set only `APP__INFRA__NODE__URL`. `indexer-standalone:4.0.2` requires more than that and crashes at boot with `missing field 'secret' for key "INFRA" in APP__ environment variable(s)`. Adopt the full env from the official [`midnight-local-dev` `standalone.yml`](https://github.com/midnightntwrk/midnight-local-dev):

```yaml
services:
  proof-server:
    image: midnightntwrk/proof-server:8.0.3
    command: ["midnight-proof-server", "-v"]
    ports: ["6300:6300"]

  node:
    image: midnightntwrk/midnight-node:0.22.5
    environment:
      CFG_PRESET: dev            # standalone dev chain, no partner-chain follower
    ports: ["9944:9944"]

  indexer:
    image: midnightntwrk/indexer-standalone:4.0.2
    depends_on: [node]
    environment:
      APP__INFRA__NODE__URL: ws://node:9944
      APP__APPLICATION__NETWORK_ID: undeployed
      APP__INFRA__STORAGE__PASSWORD: indexer
      APP__INFRA__PUB_SUB__PASSWORD: indexer
      APP__INFRA__LEDGER_STATE_STORAGE__PASSWORD: indexer
      APP__INFRA__SECRET: "303132333435363738393031323334353637383930313233343536373839303132"
      APP__INFRA__SPO_NODE__BLOCKFROST_ID: "placeholder-not-used-standalone"
    ports: ["8088:8088"]
```

`APP__INFRA__SECRET` must be 32 hex-encoded bytes (64 hex chars). `APP__INFRA__SPO_NODE__BLOCKFROST_ID` is a required placeholder for standalone mode. Force-recreate the containers (`docker compose up -d --force-recreate`) when you change these — the indexer caches its config on a named volume.

**GraphQL readiness must use POST**, not GET. `curl` the endpoint with `-X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}'`; a bare GET returns `405 Method Not Allowed` and is not evidence of a broken indexer. Any readiness script (including `scripts/midnight-standalone.mjs`) must POST.

Env for the frontend:

```
VITE_NETWORK_ID=undeployed
VITE_INDEXER_URL=http://localhost:8088/api/v4/graphql
VITE_INDEXER_WS_URL=ws://localhost:8088/api/v4/graphql/ws
VITE_PROOF_SERVER_URL=http://localhost:6300
VITE_DEFAULT_CONTRACT=<hex, written by deploy script>
```

Note: the standalone indexer (v4.0.2) serves GraphQL on **`/api/v4/graphql`**, the same path as the hosted preview/preprod indexers. The old `/api/v1/graphql` path returns a 308 redirect loop on the public fly.dev URL and should not be used anywhere.

Local indexer subscriptions available on 4.0.2 are: `blocks`, `contractActions`, `dustLedgerEvents`, `shieldedTransactions`, `unshieldedTransactions`, `zswapLedgerEvents`. There is **no `wallet` subscription** and no `ProgressUpdate`/`ViewingUpdate` types — those live on the newer wallet@5 schema. Any deploy or provider stack that tries to subscribe to `wallet` on this indexer fails with `Unknown field "wallet" on type "Subscription"` (see next section).

## Preview/Preprod network table (unchanged)

| Network | `VITE_NETWORK_ID` | Address prefix | Faucet | Explorer |
| --- | --- | --- | --- | --- |
| Preview | `preview` | `mn_shield-addr_undeployed1…` / `mn_addr_undeployed1…` (Lace labels "Preview") | `midnight-tmnight-preview.nethermind.dev` | `preview.midnightexplorer.com` |
| Preprod | `preprod` | `mn_shield-addr_test1…` / `mn_addr_test1…` | `midnight-tmnight-preprod.nethermind.dev` | `preprod.midnightexplorer.com` |

For public testnets, run the proof server image that matches the support matrix: `midnightntwrk/proof-server:8.1.0`. For the local Undeployed stack, use `midnightntwrk/proof-server:8.0.3` from the official `midnight-local-dev` repo.

## Combined "quick start" — one macro per platform

macOS / Linux (Docker Desktop or colima running):

```bash
compact update
bun install
bun run compile          # compact compile → copy artefacts → docker compose up -d → deploy → write .env
bun run dev
```

Windows PowerShell:

```powershell
compact update
bun install
bun run compile
bun run dev
```

`package.json` scripts that make this work end-to-end:

```json
{
  "scripts": {
    "midnight:compile": "compact compile contracts/MyContract.compact contracts/managed/my-contract",
    "midnight:artefacts": "rm -rf public/contract && mkdir -p public/contract && cp -r contracts/managed/my-contract/keys contracts/managed/my-contract/zkir contracts/managed/my-contract/contract public/contract/",
    "midnight:up": "docker compose up -d && node -e \"setTimeout(()=>{},15000)\"",
    "midnight:down": "docker compose down -v",
    "midnight:deploy": "bun scripts/deploy-midnight.mjs",
    "compile": "bun midnight:compile && bun midnight:artefacts && bun midnight:up && bun midnight:deploy"
  }
}
```

Bake artefact copy into `bun run compile` from day one — the browser goes silently out of sync otherwise.

## Canonical Compact contract (unchanged)

```compact
pragma language_version 0.23;
import CompactStandardLibrary;

export ledger entry_count: Counter;
export ledger last_message: Opaque<"string">;
export ledger last_author_commitment: Bytes<32>;

witness localSecretKey(): Bytes<32>;

constructor() { entry_count.increment(1); }

export circuit appendEntry(newMessage: Opaque<"string">): [] {
  const sk = localSecretKey();
  const seq = entry_count as Field as Bytes<32>;
  last_author_commitment = disclose(
    persistentHash<Vector<3, Bytes<32>>>([pad(32, "log:author:"), seq, sk])
  );
  last_message = disclose(newMessage);
  entry_count.increment(1);
}
```

Type-casting rules:
- `Counter → Field → Bytes<32>` is two steps: `x as Field as Bytes<32>`.
- String literals in `constructor()` are `Bytes<N>`, not `Opaque<"string">`. Don't try to initialize an `Opaque<"string">` ledger field with `"(empty)"`.

## Deploy script (`scripts/deploy-midnight.mjs`) — every gotcha baked in

Skeleton with the six lessons that cost the most time:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';   // ← ①
import { Contract } from '../public/contract/contract/index.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ② Resolve ZK config from PROJECT ROOT, not scripts/
const ZK_CONFIG_PATH = path.resolve(__dirname, '..', 'contracts', 'managed', 'my-contract');

setNetworkId(NetworkId.Undeployed);

// ③ Genesis-funded standalone seed is ...0002 (NOT ...0001)
const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000002';

// ④ Password policy: ≥3 of {upper, lower, digit, symbol}
const PRIVATE_STORAGE_PASSWORD = 'Choreo-Kits-Local-2026!';

const deployerSecret = crypto.getRandomValues(new Uint8Array(32));

const wallet = await WalletBuilder.buildFromSeed(
  process.env.VITE_INDEXER_URL,
  process.env.VITE_INDEXER_WS_URL,
  process.env.VITE_PROOF_SERVER_URL,
  'ws://localhost:9944',
  GENESIS_SEED,
  NetworkId.Undeployed,
);
wallet.start();
await new Promise(r => setTimeout(r, 15000));   // ⑤ let wallet see genesis balance

const baseProviders = {
  privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: 'midnight-priv' }),
  publicDataProvider: indexerPublicDataProvider(process.env.VITE_INDEXER_URL, process.env.VITE_INDEXER_WS_URL),
  zkConfigProvider: new NodeZkConfigProvider(ZK_CONFIG_PATH),
  proofProvider: httpClientProofProvider(process.env.VITE_PROOF_SERVER_URL),
  privateStoragePasswordProvider: { get: async () => PRIVATE_STORAGE_PASSWORD },
  walletProvider: {
    coinPublicKey: wallet.state().coinPublicKey,
    // ⑥ contracts SDK calls balanceTx WITHOUT ttl → dust wallet crashes on undefined.getTime()
    balanceTx: (tx, newCoins) => wallet.balanceTransaction(tx, newCoins, ttlOneHour()),
  },
  midnightProvider: {
    submitTx: (tx) => wallet.submitTransaction(tx),
    balanceTx: (tx, newCoins) => wallet.balanceTransaction(tx, newCoins, ttlOneHour()),
  },
};

// ⑦ Explicit witness object — withVacantWitnesses does NOT satisfy contracts that declare witnesses
const contractInstance = new Contract({
  localSecretKey: (ctx) => [ctx, deployerSecret],
});

// ⑧ Retry loop + fresh privateStateId per attempt
for (let i = 0; i < 8; i++) {
  try {
    const deployed = await deployContract(
      { ...baseProviders, privateStateId: `deploy-${Date.now()}-${i}` },
      {
        contract: contractInstance,
        initialPrivateState: { localSecretKey: deployerSecret }, // ⑨ REQUIRED
      },
    );
    console.log('Deployed at', deployed.deployTxData.public.contractAddress);
    // write VITE_DEFAULT_CONTRACT into .env here
    process.exit(0);
  } catch (e) {
    if (i === 7) throw e;
    console.warn(`Deploy attempt ${i+1} failed: ${e.message}. Retrying in 10s…`);
    await new Promise(r => setTimeout(r, 10000));
  }
}
```

Add a `checkContainerHealthy('node')` shell probe (parse `docker inspect`) before the wait — a crash-looping node otherwise hangs 15s + 8×10s = 95s before the first useful error.

### Deploy-script cheat sheet (memorize)

| ID | Rule |
| --- | --- |
| ① | Force `ttlOneHour()` in **both** `walletProvider.balanceTx` AND `midnightProvider.balanceTx`. |
| ② | `ZK_CONFIG_PATH` = `resolve(__dirname, '..', 'contracts/managed/<name>')`. Missing `..` → ENOENT. |
| ③ | Standalone genesis funds seed `…0002`, not `…0001`. Wrong seed → `Insufficient Funds`. |
| ④ | Password: ≥3 of {upper, lower, digit, symbol}. `choreo-kits-local-password` fails (2 classes). |
| ⑤ | 10–15 s wait after `wallet.start()` before deploying. |
| ⑥ | Adapter must inject TTL — contracts SDK calls `balanceTx` with no TTL. |
| ⑦ | Provide an explicit witness object `{ localSecretKey: (ctx) => [ctx, key] }`. |
| ⑧ | Retry deploy 8× / 10 s with a **fresh `privateStateId`** each attempt. |
| ⑨ | `initialPrivateState: { localSecretKey: <32B> }` — required or constructor throws. |

## Publishing to Cloudflare Workers (TanStack Start) — READ FIRST

The preview passing means nothing. The published Cloudflare Worker bundle has completely different failure modes than Vite dev. Enable the production build + Publish → Update **on day one** and fix these as they surface — don't discover them the night before submission.

Four hard rules for the workerd/Nitro SSR bundle:

1. **Keep `nitro` ENABLED.** Do NOT set `nitro: false` to "escape SSR". That splits the SSR output into multiple chunks (`assets/server-*.js` importing `assets/react-*.js`) that the Worker runtime can't resolve — you get `Error: No such module "assets/react"` on every request. The Worker needs a single inlined script.
2. **Restrict `vite-plugin-top-level-await` to the client environment only.** Applied to the SSR bundle it crashes the worker with `Identifier '__tla' has already been declared`. Wrap it:
   ```ts
   function clientTopLevelAwait(): Plugin {
     return { ...topLevelAwait(), applyToEnvironment: (env) => env.name === "client" };
   }
   ```
3. **Stub every Midnight package AND the client contract module during the SSR pass.** `ssr: false` on the route stops execution but does NOT stop the bundler from crawling the module graph. Without stubs the build dies with `[MISSING_EXPORT] "ContractState" is not exported by "@midnight-ntwrk/midnight-js-protocol/dist/compact-runtime.mjs"` or `"createCircuitCallTxInterface" is not exported by "src/lib/midnight-ssr-stub.ts"`.
   ```ts
   function midnightSsrStub(): Plugin {
     const wasmStub = path.resolve("src/lib/midnight-ssr-stub.ts");
     const contractStub = path.resolve("src/lib/contract.ssr-stub.ts");
     const contractReal = path.resolve("src/lib/contract.ts");
     return {
       name: "midnight-ssr-stub",
       enforce: "pre",
       async resolveId(id, importer, options) {
         if (!options?.ssr) return;
         if (id.startsWith("@midnight-ntwrk/")) return wasmStub;
         const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
         if (resolved && resolved.id === contractReal) return contractStub;
         return resolved;
       },
     };
   }
   ```
   The second half (resolve → swap by absolute path) is what catches `@/lib/contract`, `./contract`, and `./contract.ts` — every alias funnels to the same absolute path. Ship a matching empty `src/lib/midnight-ssr-stub.ts` (`export default {}`) and a `src/lib/contract.ssr-stub.ts` exporting inert stand-ins for every symbol the route imports (`publishKit`, `decodeChainState`, `KitPayload`, `loadContractModule`).
4. **Never keep a top-level runtime `import` from `@midnight-ntwrk/*` in a route file.** Type-only `import type` is erased and safe; anything else forces the SSR crawler into the WASM package graph even with the stub. Prefer defining the `ConnectedAPI` shape locally or moving it into a client-only module.

## Frontend — TanStack Start specifics

- Mark every Midnight page `ssr: false` in the route definition (still required — the stubs above are the belt, `ssr: false` is the braces).
- Add `vite-plugin-wasm` and `vite-plugin-top-level-await` (client-scoped, see rule #2) to Vite plugins.
- `React.lazy()` of a component that uses **named exports** needs `.then(m => ({ default: m.MyNamed }))` — plain `lazy(() => import('./X'))` typechecks fail.
- Contract-address regex must be `/^(0x)?[0-9a-fA-F]{6,}$/`. The intuitive `/^0x?[0-9a-fA-F]{6,}$/` requires a literal leading `0` and rejects addresses that start with `1–9` or `a–f` (very common — e.g. `d9e6…`).
- Lace `getUnshieldedAddress()` returns EITHER `{ unshieldedAddress: string }` OR a raw `string`. Handle both:
  ```ts
  const raw = await api.getUnshieldedAddress();
  const address = typeof raw === 'string' ? raw : raw.unshieldedAddress;
  ```
- Copy compiled artefacts to `public/contract/{keys,zkir,contract}/` in the compile script; serve them with a browser `FetchZKConfigProvider` that implements `get()` + `asKeyMaterialProvider()`.
- SDK 0.22+ exports **`UnprovenTransaction`** — not `UnboundTransaction`. Old snippets are stale.

## Private state provider — DO NOT ship `levelPrivateStateProvider` to the browser

`levelPrivateStateProvider` pulls in `browser-level` → `abstract-level`, whose CJS/ESM interop breaks under production Rollup. Symptom on the published site (preview is fine — this ONLY appears in the prod bundle): a black screen and `TypeError: Class extends value undefined is not a constructor or null` from `browser-level-*.js`. There is no clean fix at the bundler layer; do not waste hours on `optimizeDeps.include` + `commonjsOptions` — it will not stick.

Instead ship a tiny `localStorage`-backed `PrivateStateProvider<string, unknown>` from day one:

- Key layout: `<prefix>:<coinPubKey>:contracts:<contractAddress>:states:<privateStateId>` and `<prefix>:<coinPubKey>:signing:<address>`.
- JSON-encode `Uint8Array` as `{ __type: "Uint8Array", data: [...] }` and reverse on read.
- Implement `setContractAddress`, `get/set/remove/clear`, `get/set/removeSigningKey`, `clearSigningKeys`; stub `exportPrivateStates`/`importPrivateStates`/`exportSigningKeys`/`importSigningKeys` — the demo doesn't need them.
- Reference implementation lives in this project's `src/lib/contract.ts` (`createPrivateStateProvider`).

Node deploy scripts CAN keep using `levelPrivateStateProvider` — the ban is browser-only. Node CJS interop is fine.

## Debugging a black / "This page didn't load" published page on mobile

Preview looks perfect, published shows the generic error boundary or a blank screen. The root `errorComponent` and the SSR fallback are hiding the real error. Playbook:

1. Temporarily render `error.message` + `error.stack` inside the root TanStack `errorComponent` (`src/routes/__root.tsx`).
2. Wrap the SSR entry (`src/server.ts`) in try/catch and inline the caught stack into the fallback HTML so SSR-only crashes are visible too.
3. **Publish → Update** and reload on the phone — the real error is now readable.
4. Common culprits ranked: (a) `browser-level` CJS interop, (b) `MISSING_EXPORT` from an un-stubbed `@midnight-ntwrk/*`, (c) `__tla` collision (TLA plugin in SSR), (d) `assets/react` module-not-found (`nitro: false`).
5. Revert the verbose error UI once fixed — never ship stack traces to real users.

## Vite config essentials (Cloudflare Worker target)

```ts
import { defineConfig } from '@lovable.dev/vite-tanstack-config'; // Lovable template
import type { Plugin } from 'vite';
import path from 'node:path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

function midnightSsrStub(): Plugin { /* see "Publishing to Cloudflare Workers" above */ }
function clientTopLevelAwait(): Plugin {
  return { ...topLevelAwait(), applyToEnvironment: (env) => env.name === 'client' };
}

export default defineConfig({
  // Keep nitro ENABLED (default). Do NOT set nitro: false.
  vite: {
    plugins: [midnightSsrStub(), wasm(), clientTopLevelAwait()],
    build: {
      target: 'esnext',
      commonjsOptions: { transformMixedEsModules: true, defaultIsModuleExports: 'auto' },
    },
    resolve: { conditions: ['browser', 'import', 'default'] },
    ssr:     { resolve: { conditions: ['browser', 'node', 'import', 'default'] } },
    optimizeDeps: {
      esbuildOptions: { target: 'esnext', supported: { 'top-level-await': true } },
      include: ['@midnight-ntwrk/compact-runtime'],
      exclude: [
        '@midnight-ntwrk/onchain-runtime-v3',
        '@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_bg.wasm',
      ],
    },
  },
});
```

## Reading public ledger state (no wallet needed)

```ts
const r = await fetch(import.meta.env.VITE_INDEXER_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `query($a:HexEncoded!){ contractAction(address:$a){ state } }`,
    variables: { a: contractAddress },
  }),
});
const stateHex = (await r.json()).data?.contractAction?.state;
```

Decode with the compiled contract's `ledger(state)` helper from `public/contract/contract/index.cjs` — client-only module.

## Funding (only if you insist on preview/preprod)

tNIGHT ≠ tDUST. Faucet dispenses tNIGHT; deploys spend tDUST.

**Preferred derivation path — `midnight-wallet-cli`** (community CLI, recommended by Midnight dev-rel in #dev-chat, 27 July 2026). Do NOT hand-roll `WalletSeeds` + `createKeystore` + address encoders when you just need a bech32 address for the faucet:

```bash
npm i -g midnight-wallet-cli

# --seed is the 64-char HEX master seed (32 bytes), NOT a BIP-39 mnemonic
mn address --seed <64-hex-master-seed> --network preprod
# → mn_addr_preprod1…

mn balance <mn_addr_preprod1…> --network preprod
```

`--network` accepts `preprod`, `preview`, `undeployed`, `mainnet`. Prints the UNSHIELDED bech32 (`mn_addr_…`) the faucet wants; shielded (`mn_shield-addr_…`) is a different identity the faucet rejects. Never accept a user's seed in chat — run locally only. Our `scripts/derive-unshielded-address.mjs` remains as an offline fallback for hosts without npm.

Then:
1. Copy the printed **unshielded** address (or read it from Lace).
2. Paste into the faucet → tNIGHT arrives.
3. In Lace, click **Generate tDUST** to delegate → tDUST appears.
4. Only now can you deploy.

References: https://www.npmjs.com/package/midnight-wallet-cli · https://github.com/nel349/midnight-wallet-cli

## Funding the Undeployed wallet — the hidden gotcha

The genesis-funded seed (`…0002`) only funds the **deployer wallet** used by `scripts/deploy-midnight.mjs`. It does **not** fund the Lace browser extension that a demo user connects to `VITE_NETWORK_ID=undeployed`.

- Lace connected to `undeployed` starts with **0 / 250,000 tDUST**.
- Every contract write (mint, prove, etc.) pays fees in tDUST.
- If the Lace wallet has no tDUST, the transaction fails after signing with a generic "Unexpected error submitting scoped transaction" or an insufficient-balance error.

### How to fund Lace on Undeployed

Use the local dev faucet/tool against the Lace **unshielded** address:

```bash
# Example using midnight-local-dev (install from Midnight docs/tooling)
midnight-local-dev faucet --to $(cat lace-unshielded-address.txt) --network undeployed
```

Or ship a helper script in the repo:

```bash
# scripts/fund-lace.sh
ADDRESS=$1
midnight-local-dev faucet --to "$ADDRESS" --network undeployed
```

Run it from the terminal where Docker Compose is running, then refresh Lace and confirm the tDUST balance is non-zero before minting.

### UI guard

Read the Lace dust balance and disable the write button when it is zero:

```ts
const dust = await api.getDustBalance();
// dust is usually an object like { balance: bigint, ... }
```



## Undeployed writes: the server-append pattern (ChoreoCrowd Fund learnings)

This is the #1 architectural decision on Undeployed. Get it wrong and you'll lose a full day to `Custom error: 117` and mystery `ChargedState` crashes.

Mental model:

```text
Undeployed:  UI → POST /api/append-entry → genesis wallet (server) → chain
Other nets:  UI → LaceWalletProvider → Lace signs in browser → chain
Reads (all): fetchPublicContractLedger via indexer, no wallet needed
```

### One shared constant, imported from BOTH sides

```ts
// src/lib/midnight-shared.ts
export const GENESIS_SEED        = '0000000000000000000000000000000000000000000000000000000000000002';
export const PRIVATE_STATE_STORE = 'my-app-priv';   // pick one name, use it everywhere
```

Both `scripts/deploy-midnight.mjs` and `src/lib/append-entry.server.ts` must call
`initializeMidnightProviders({ privateStateStoreName: PRIVATE_STATE_STORE, ... })` with the
same value. `findDeployedContract` reads/writes the deployer's signing key in a LevelDB store
keyed by that name + the contract address. Mismatch → no key found → SDK **samples a fresh
signing key** → on-chain contract authority no longer matches → chain rejects the tx with
`RpcError 1010: Invalid Transaction: Custom error: 117`.

Debug tip: log the first/last 8 chars of `deployed.deployTxData.private.signingKey` on both
sides. They must match byte-for-byte.

### `ledger()` call shape — pass the inner state

```ts
// From getPublicStates():
const { contractState } = await getPublicStates(publicDataProvider, address);
const onChain = ledger(contractState.data);              // .data, not the wrapper

// Right after a successful callTx:
const onChain = ledger(result.public.nextContractState);
```

Passing the raw `ContractState` wrapper throws `expected instance of ChargedState`.

### Recovery after Docker reset

`midnight:down` wipes chain state and the address in
`src/data/midnight-contract.undeployed.json` becomes dead:

```bash
bun run midnight:down
bun run midnight:up
bun run midnight:deploy       # refreshes midnight-contract.undeployed.json
# restart the dev server so it re-imports the JSON
```

The server-append route caches `wallet + providers` in a module-scope `ctxPromise` for warm-path
speed. Invalidate it when the contract address changes — otherwise the 2nd+ append silently
targets the previous contract and fails with error 117 or a stale-state error. Pattern:

```ts
let cachedAddress: string | null = null;
let ctxPromise: Promise<Ctx> | null = null;
export async function getCtx(address: string) {
  if (address !== cachedAddress) { cachedAddress = address; ctxPromise = buildCtx(address); }
  return ctxPromise!;
}
```

### `optimizeDeps.exclude` additions for the server-append path

`testkit-js` pulls in Node-only deps transitively (`pino`, `ws`, `ssh2`, `cpu-features`). Vite /
Rolldown tries to pre-bundle them and the dev server hangs on "Loading …" forever. Extend the
existing exclude list:

```ts
optimizeDeps: {
  exclude: [
    // … existing @midnight-ntwrk/* entries …
    '@midnight-ntwrk/testkit-js',
    'pino', 'ws', 'ssh2', 'cpu-features',
  ],
}
```

### SSR stub for the server function

Add `src/lib/append-entry.server.ts` → `src/lib/append-entry.ssr-stub.ts` to the
`midnightSsrStub()` swap list (same pattern as `mint.server.ts`). The stub returns 500 with a
clear "dev-only" message — the published Cloudflare Worker can't reach the local Docker stack
anyway. Gate the stub on `command === "build"` so dev SSR still loads the real Midnight libs.

### UX: a disabled write button is almost always empty form fields

`canFund` / `canMint` usually requires every input non-empty AND (for deployed networks) Lace
connected with tDUST. Show a tooltip that names the missing field ("Enter a project name and an
amount to enable") so no one chases a phantom wallet bug for an hour.


## Failure modes ranked by frequency (with new rows)

| Symptom | Cause | Fix |
| --- | --- | --- |
| `RpcError 1010: Invalid Transaction: Custom error: 117` on Undeployed append | Signing-key store mismatch: `privateStateStoreName` in deploy script ≠ server-append route → `findDeployedContract` sampled a fresh key → chain rejects | Import ONE shared `PRIVATE_STATE_STORE` constant from `src/lib/midnight-shared.ts` in both files. Log first/last 8 chars of the signing key on both sides to confirm they match |
| `expected instance of ChargedState` when calling `ledger(...)` | Passed the raw `ContractState` wrapper instead of the inner state | Pass `contractState.data` (from `getPublicStates`) or `result.public.nextContractState` (after `callTx`) |
| Dev server stuck on "Loading …" fallback, `bun run dev` never boots the app | Rolldown/Vite pre-bundling Node-only transitive deps pulled in by `@midnight-ntwrk/testkit-js` | Add `@midnight-ntwrk/testkit-js`, `pino`, `ws`, `ssh2`, `cpu-features` to `optimizeDeps.exclude` |
| First append works, 2nd+ appends fail silently or 117 | Stale `ctxPromise` cache in the server route after redeploy | Invalidate `ctxPromise` when the contract address changes; restart the dev server after `midnight:deploy` |
| Undeployed append fails after `docker compose down` / `up` | Chain state wiped; `midnight-contract.undeployed.json` still references the previous contract | Always run `bun run midnight:deploy` after any `midnight:down`/`up`, then restart the dev server |
| "Prove & submit" button greyed out despite Lace connected | Empty form field; not a wallet bug | Tooltip naming the missing field; check `canFund` / `canMint` predicate |
| `Cannot connect to the Docker daemon` | Docker Desktop / colima not started | Start it, wait for the whale icon, retry |
| Pull fails `midnightntwrk/midnight-node:latest not found` | `latest` tag doesn't exist | Pin `0.22.5` |
| Node container in "Restarting" loop, logs say `db_sync_postgres_connection_string must be defined` | Using partner-chain 2.x image | Switch to `midnight-node:0.22.5` with `CFG_PRESET=dev` |
| Node logs: `mock_registrations_file must be defined if use_main_chain_follower_mock is true` | Same — partner-chain image can't run standalone even in mock mode | Same fix; don't fight the 2.x image |
| Deploy fails `Insufficient Funds: could not balance dust` on fresh local chain | Wrong seed (`…0001`) OR deploying before wallet syncs the genesis balance | Use seed `…0002`; wait 15 s post-`wallet.start()`; retry loop |
| `undefined is not an object (evaluating 'arg0.getTime')` in `Transacting.js` | Contracts SDK calls `balanceTx` without a TTL; dust wallet crashes | Force `ttlOneHour()` inside both balance adapters |
| `Password must contain at least 3 of: uppercase letters, lowercase letters, digits, special characters. Found: 2` | Weak `privateStoragePasswordProvider` password | Use ≥3 character classes, e.g. `Choreo-Kits-Local-2026!` |
| `does not contain a function-valued field named localSecretKey` | Missing witness object on the `Contract` instance | Pass `{ localSecretKey: (ctx) => [ctx, key] }` and `initialPrivateState` |
| `Failed to read verifier key … ENOENT … scripts/contracts/managed/…` | `ZK_CONFIG_PATH` resolved from `scripts/` | `path.resolve(__dirname, '..', 'contracts/managed/<name>')` |
| Frontend says "Enter the hex contract address" for a valid `d9e6…` | Regex `/^0x?[0-9a-fA-F]{6,}$/` requires literal `0` | Use `/^(0x)?[0-9a-fA-F]{6,}$/` |
| Nitro SSR build `MISSING_EXPORT` on `@midnight-ntwrk/*` | SSR bundler crawls WASM package graph even with `ssr: false` route | Add `midnightSsrStub()` Vite plugin that redirects `@midnight-ntwrk/*` to an empty stub during the SSR pass. Keep nitro ENABLED. |
| Build error `MISSING_EXPORT "createCircuitCallTxInterface" is not exported by "src/lib/midnight-ssr-stub.ts"` | Client contract module was pulled into SSR bundle and hit the stub | Extend `midnightSsrStub()` to resolve then swap `src/lib/contract.ts` → `src/lib/contract.ssr-stub.ts` by absolute path |
| Published site 500 `Error: No such module "assets/react"` from `assets/server-*.js` | Someone set `nitro: false` — SSR bundle split into chunks workerd can't resolve | Re-enable nitro; keep the Midnight SSR stubs |
| Published site 500 `Identifier '__tla' has already been declared` | `vite-plugin-top-level-await` applied to the SSR bundle | Wrap plugin with `applyToEnvironment: (env) => env.name === "client"` |
| Published `/` shows generic "This page didn't load" or blank screen, preview works | Client-hydration crash hidden by root ErrorBoundary | Temporarily inline `error.message` + `error.stack` in the root `errorComponent` and SSR fallback; publish; read the real error; revert |
| Prod runtime `TypeError: Class extends value undefined is not a constructor or null` in `browser-level-*.js` | `levelPrivateStateProvider` → `browser-level` → `abstract-level` CJS/ESM interop breaks under production Rollup | Swap for a `localStorage`-backed `PrivateStateProvider` in the browser; keep `levelPrivateStateProvider` only in Node deploy scripts |
| `React.lazy` typecheck fails on Midnight components | Named export used with default-only `lazy` | `lazy(() => import('./X').then(m => ({ default: m.X })))` |
| `TypeError: undefined is not iterable` reading `unshieldedAddress` | Lace returns raw string in some builds | Handle both `string` and `{ unshieldedAddress }` |
| `ReferenceError: Buffer is not defined` | Missing polyfill | `import { Buffer } from 'buffer'; globalThis.Buffer = Buffer;` as FIRST line of client entry |
| Contract state undefined after deploy | ZK keys not served to browser | Ensure `public/contract/{keys,zkir,contract}/` populated by `bun run compile` |
| Proof "hangs" 60–240 s on first Mint | Cold proof server loading proving key + JITing WASM; then Lace re-proves the balanced tx a second time before signing | Expected — one Mint = two proofs. Show a `Proving…` state with "up to ~4 min on first mint"; no timeout under 5 min. Warm subsequent proofs drop to ~30–60s. |
| `window is not defined` at build/SSR | MidnightJS at module scope in a TanStack route | Move behind `useEffect` / `<ClientOnly>`; deploys via Node script only |
| `Lace not found` | Extension not installed / injected late | Poll `window.midnight` for 5 s before rejecting |
| `Cannot find package 'bip39'` etc. in deploy script | Node script deps not `bun add`-ed | Add every import to `package.json` |
| Preview shielded/unshielded prefix mismatch (`mn_addr_preview1…` vs `mn_shield-addr_test1…`) | Encoders derived through different `NetworkId` values | Use ONE `NetworkId` for both encoders in the script; validate the emitted prefix |
| Mint fails after Lace signs / Lace shows 0 / 250,000 tDUST | Lace wallet on Undeployed has no tDUST for fees | Fund the Lace unshielded address with tDUST via the local dev faucet; surface `getDustBalance()` in the UI and disable the mint button when balance is zero |
| User pastes their recovery phrase in chat | Full-wallet-control exfiltration risk | REFUSE. Give them a local `scripts/check-midnight-wallet.mjs` that reads `MIDNIGHT_WALLET_SEED` from their shell env and prints only public addresses |


## Network → NetworkId mapping

| `VITE_NETWORK_ID` | `NetworkId` | Unshielded prefix | Shielded prefix |
| --- | --- | --- | --- |
| `undeployed` | `NetworkId.Undeployed` | `mn_addr_undeployed1…` | `mn_shield-addr_undeployed1…` |
| `preview` | `NetworkId.Undeployed` (yes, Preview reuses Undeployed) | `mn_addr_undeployed1…` (Lace shows "Preview") | `mn_shield-addr_undeployed1…` |
| `preprod` / `testnet` | `NetworkId.TestNet` | `mn_addr_test1…` | `mn_shield-addr_test1…` |
| `mainnet` | `NetworkId.MainNet` | `mn_addr1…` | `mn_shield-addr1…` |

Use ONE `NetworkId` across BOTH encoders. Validate the emitted bech32 prefix before writing `.env` / `src/data/midnight-contract.json`; abort on mismatch.

## Deploy status UI pattern

```tsx
import contract from '@/data/midnight-contract.json';
const PLACEHOLDER = '0'.repeat(64);
const deployed = contract.address && contract.address !== PLACEHOLDER;
```

Treat the all-zero address as "not yet deployed". Show a "run `bun run compile`" hint otherwise. For Undeployed, skip explorer links (there is none) and instead render the local Indexer GraphQL URL as the "proof it's real" surface.

## Recovery-phrase safety (hard rule)

Never accept a seed phrase in chat. Ship a local script that reads `MIDNIGHT_WALLET_SEED` from the user's shell env and prints only public addresses. Never log, echo, or `console.log` the seed.

## Retrospective — how I'd do it differently next time

1. **Default to Undeployed + Docker Compose from minute one.** Preview/Preprod's tNIGHT→tDUST dance is a hackathon killer. Only reach for the hosted testnets when the demo needs real Lace users.
2. **Write `scripts/deploy-midnight.mjs` BEFORE any UI.** All the deep pain (TTL injection, witness shape, password rules, seed index, ZK config path, retry-with-fresh-`privateStateId`) lives here. A working deploy unblocks everything downstream; a broken deploy blocks all of it.
3. **Fund Lace on Undeployed before letting the user mint.** The genesis-funded seed (`…0002`) only pays for the deploy script. Every connected Lace wallet (including the demo wallet) starts with 0 tDUST and needs its own funds, or writes will fail with a cryptic submission error. Surface `getDustBalance()` in the UI and disable the mint button when balance is zero.
4. **Assume every wallet-SDK adapter needs a TTL shim.** Any `balanceTx` you hand to `midnight-js-contracts` must force `ttlOneHour()` — never trust the caller.
5. **Bake artefact copy into `bun run compile`.** `compact compile` → copy `keys/`, `zkir/`, `contract/` into `public/contract/` in one script; the browser silently drifts otherwise.

5. **Pin every Docker tag.** `latest` doesn't exist for `midnight-node`, and the partner-chain 2.x tags don't run standalone. For local Undeployed, `0.22.5` / `4.0.2` / `8.0.3` is the known-good triple from the official `midnight-local-dev` repo. For public Preview / Preprod, use the matrix proof server tag (`8.1.0` as of this snapshot) and align every dependency to the same matrix row.
6. **Fail fast on a crash-looping node** — probe `docker inspect` health before the 15 s sync wait, or you'll spend 95 s per failed attempt discovering the container never came up.
7. **On TanStack Start, keep Nitro ENABLED and stub Midnight during the SSR pass.** The instinct to `nitro: false` is a trap — it swaps a fixable build error for an unfixable runtime one on the published Worker. Route stays `ssr: false`, `midnightSsrStub()` handles the bundler crawl, `vite-plugin-top-level-await` is client-only.
8. **Ban `browser-level` from the browser bundle on day one.** Ship a `localStorage`-backed `PrivateStateProvider` from the first commit. Every Node-ecosystem storage lib (`level`, `classic-level`, `browser-level`, `abstract-level`) will eventually break production Rollup's CJS/ESM interop — pick pure JS or `IndexedDB` from the start.
9. **Test the production build + Publish → Update on day one, not the night before.** Preview runs on Vite dev; published runs on workerd/Nitro/Rollup. Every failure mode in the "Publishing to Cloudflare Workers" section is invisible in preview.

## Anti-patterns

- Don't call `initialAPI.connect(...)` without `setNetworkId(...)` first.
- Don't store the 32-byte witness secret on the server or in a cookie — localStorage only.
- Don't pretend a public ledger commitment is private. It's public. Only the witness stays hidden.
- Don't run the write path under SSR / `build:dev` prerender.
- Don't deploy from a Cloudflare Worker / TanStack server function — no Docker, no proof server, no localhost. Deploys are a local `bun` script.
- Don't accept a user's recovery phrase in chat.
- Don't derive unshielded and shielded addresses through different `NetworkId` values.
- Don't assume Node scripts under `scripts/` inherit Vite's dep resolution — every import must be `bun add`-ed.
- Don't try to skip the retry loop around `deployContract` on a fresh local chain — the wallet sync race is real.
- Don't use `withVacantWitnesses` for a contract that declares any witnesses; supply the object explicitly.

## Cross-references

- Fly.io hosting for the node/indexer/proof-server (when a laptop can't run Docker): see the `canton-fly-deploy` skill for the flyctl pattern; adapt image names to Midnight's.
- One-time toolchain install (Compact compiler, Docker Desktop, VS Code extension): see `midnight-environment-setup`.
- Just the wallet-connect UI without contracts: see `react-wallet-connector`.

## Agentic-commerce overlays (A2A + AP2, UCP, x402 · mUSDC)

Optional overlay on top of the base Midnight stack: every agentic prompt closes with a real Midnight transaction. Three protocols, three Compact contracts, one banner.

### Non-negotiables

1. **Every overlay ends with a Midnight tx.** A2A/UCP/x402 negotiations that don't anchor on-chain are out of scope — the whole point of the overlay is auditability against a Midnight indexer, not off-chain messaging.
2. **mUSDC is a MIMIC token. No peg, no value.** Ship `MidnightUSDC.compact` with a 10-mUSDC faucet cap and NEVER deploy to Mainnet. Every UI that shows an mUSDC balance must render `<ExperimentalAgenticBanner>` and link to `/agentic-experimental`.
3. **Banner is non-dismissible on Mainnet.** On Preview/Preprod/Undeployed it may be collapsible (localStorage key `agentic-banner-ack`), but it must render on every page that touches the overlay.
4. **Compact-witness signing, NOT EIP-712.** Cross-verifying AP2 mandates from this stack against EVM verifiers won't work — buyer/seller/merchant public keys are `persistentHash([pad(32,"<domain>:v1"), sk])`. Domain separators are per-protocol and MUST NOT be reused (`ap2:buyer:v1`, `ucp:merchant:v1`, `musdc:signer:v1`).
5. **Facilitator falls back to `{ simulated: true }` when no contract is deployed.** Never crash at boot for missing config — same demo-fallback contract as the base skill. Return a stub `midnightTxHash: "0xSIMULATED"` and let the UI surface a "simulated" chip.
6. **x402 header casing is literal.** `PAYMENT-SIGNATURE` (request), `PAYMENT-RESPONSE` (response). Send exactly that. Read case-insensitively.
7. **x402 v2 envelope, Midnight scheme.** `scheme: "midnight-mUSDC"`, `network: "midnight:<preview|preprod|undeployed>"`, `amount` in atomic 6-decimal units as a string. The signed payload wraps under `accepted` (echo the full requirement), NOT at the top level.
8. **Nonce is bytes32 random, never reused.** `spent_nonces: Set<Bytes<32>>` on `MidnightUSDC` enforces this on-chain — the client must also generate a fresh nonce per attempt.
9. **RFC 9421 signing keys are anchored on `OrderLedger.recordSigningKey` on first boot.** UCP callers verify signatures against the on-chain fingerprint, not just the discovery doc.

### Contracts (drop into `contracts/`)

| Contract | Purpose | Domain separator |
|---|---|---|
| `MandateVault.compact` | Anchor signed AP2 CartMandate hashes | `ap2:buyer:v1` |
| `OrderLedger.compact`  | Record UCP order hashes + merchant signing-key fingerprint | `ucp:merchant:v1` |
| `MidnightUSDC.compact` | mUSDC mimic token: faucet + EIP-3009-style transfer + spent-nonce set | `musdc:signer:v1` |

All three follow the base skill's rules: `pragma language_version 0.23;`, `import CompactStandardLibrary;`, every ledger write is `disclose(...)`, witness bodies live in TypeScript.

### Server routes (drop into `src/routes/api/public/`)

All routes bypass Lovable's published-site auth gate — verify inputs yourself. Under-load callable, so the facilitator MUST be idempotent per nonce.

- `ap2-anchor.ts` — POST { mandateHash, buyer, seller, amount, proof }; on Undeployed uses the genesis wallet (`…0002`), on Preview/Preprod uses Lace `publishKit`.
- `ucp-discovery.ts` / `ucp-checkout.ts` / `ucp-self-test.ts` — RFC 9421-signed discovery + order recorder + conformance self-test.
- `x402-proxy.ts` / `x402-challenge.ts` / `x402-verify.ts` / `x402-settle.ts` — CORS-safe same-origin proxy, 402 challenge, proof verify against the contract's verifier, and settlement via `MidnightUSDC.transfer`.

### Failure modes specific to the overlay

| Symptom | Cause | Fix |
|---|---|---|
| AP2 verifier rejects a mandate with matching hash | Buyer signed with a different domain separator (e.g. reused `ucp:merchant:v1`) | Use `ap2:buyer:v1` in both the Compact circuit AND the TypeScript witness derivation |
| x402 client gets `invalid_payload` from the facilitator | Sent v1 envelope (`scheme`/`network` at top level) | Wrap under `accepted` — echo the full requirement chosen from `accepts[]` |
| `nonce already spent` on retry | Client reused the nonce after a network hiccup | Generate a fresh `crypto.getRandomValues(new Uint8Array(32))` per attempt; never store-and-replay |
| UCP receipt verifies signature but the on-chain fingerprint is empty | `recordSigningKey` never called on first boot | Call it once from a bootstrap route or the deploy script |
| Facilitator returns a real `midnightTxHash` in preview but the UI shows "simulated" | Response passed through a proxy that dropped `PAYMENT-RESPONSE` | Restore the header in the proxy (`res.headers.set("PAYMENT-RESPONSE", …)`) — it's non-standard, most proxies strip unknown headers |
| Buyer signs an AP2 mandate but `anchorMandate` reverts with `buyer signature invalid` | Buyer public key derived on the client with a different byte layout than the circuit expects | Match exactly: `persistentHash<Vector<2, Bytes<32>>>([pad(32, "ap2:buyer:v1"), sk])` — no extra fields, no different order |
| Mainnet publish attempts an x402/mUSDC path | mUSDC has no peg — this is a real security risk | Gate the overlay off Mainnet entirely; keep the disclaimer banner non-dismissible on Mainnet routes |

### Prompt-catalogue split

For a hackathon prompt bundle, the overlay adds three theme slugs on top of the base 10 disciplines:

- `agentic-a2a-ap2` — 500 ideas (buyer↔seller negotiation flows)
- `agentic-ucp` — 250 ideas (RFC 9421 signed checkout flows)
- `agentic-x402` — 250 ideas (pay-per-call with mUSDC)

Multiply by the 4-network × 3-OS matrix if you're generating full prompt variants.

## 2026-07 update — flymidnight hard-won lessons (Fly.io hosted Undeployed)

From `github.com/arunnadarasa/flymidnight` — the canonical working example of a public
Fly-hosted Undeployed stack. Skip any one and hours evaporate.

1. **Readiness = `state.dust.state.progress.isStrictlyComplete()`.** WalletFacade 4.1.1
   shape. Do NOT check `state.progress?.isSynced`, `state.progress === true`, or an older
   `walletReady` boolean — those never flip on 4.1.1. Symptom: "warming up" toast stuck
   forever after DUST is fully synced.

2. **Browser → proof server MUST use the public HTTPS URL.** `https://choreo-proof.fly.dev`.
   Proof binary is IPv4-only, Fly 6PN is IPv6-only, browser is HTTPS —
   `choreo-proof.internal:6300` fails on all three counts. No socat wrapper: distroless
   image has no shell (`exec: 127`). Only server-to-server 6PN calls use `.internal` names.

3. **`VITE_DEFAULT_CONTRACT` must OVERRIDE cached localStorage on load.** After a Fly
   redeploy the volume can rotate; yesterday's cached address is dead. On boot prefer
   `import.meta.env.VITE_DEFAULT_CONTRACT`, fall back to localStorage. Symptom if inverted:
   `Couldn't find template …` on every write after redeploy.

4. **Preflight probe order: node → indexer HTTP → indexer WS → proof HTTP.** Node stuck
   at #0 makes every other probe return misleading errors. Fail fast on the node first.

5. **Fund each Lace visitor via an in-app `Get tDUST` button.** Genesis `…0002` funds only
   the deploy wallet; each visitor starts at 0 tDUST. Wire a button that POSTs
   `{ address }` to `${VITE_FAUCET_URL}/grant`, poll `getDustBalance()`, gate mint on
   balance > 0.

6. **Retry the faucet with backoff for 90 s after redeploy.** `wallet.start()` cold boot
   returns `503 warming up`. Show a toast, retry every 10 s.

7. **When you rebuild the node volume, refund the faucet.** Destroying `chain_data` wipes
   the faucet's tDUST too. Follow with `bun scripts/fund-faucet.mjs` (genesis `…0002` →
   faucet `/health` address) or `/grant` returns 500 `Insufficient Funds`.

## 2026-07 update — mobilemidnight hard-won lessons (Kuira Android on Undeployed)

Source: `arunnadarasa/mobilemidnight` (Tokenized Choreo Kits). First verified end-to-end Kuira dApp on Undeployed — passkey Sigil forge → `mn airdrop` funding → on-device ZK proving → 2 kits published (~25s warm prove).

### When to reach for Kuira

Mobile-first hackathon lanes (NFC tap-to-anchor, offline receipts, POS, wearables) where a browser + Lace extension is a non-starter. Passkey biometric identity replaces seed phrases. **Not a drop-in replacement** for the web/Lace path — different toolchain (Gradle/Kotlin/AVD), different local devnet (`mn localnet`, not Docker `midnight-node:0.22.5`), different funding path (`mn airdrop` CLI, no in-app browser faucet).

### Verified stack

| Piece | Version |
| --- | --- |
| Kuira SDK | `0.1.0-alpha05` |
| Compact | `0.31.1` |
| Local devnet | `mn localnet` (CLI — NOT `midnightntwrk/midnight-node:0.22.5` Docker image) |
| Proving | On-device |
| Reference AVD | API 35 `google_apis` arm64, 8GB host |

### Non-negotiables

- **Passkey `rpId` must be a real hosted domain** with a live `assetlinks.json` matching the app's package name AND the debug (or release) signing certificate SHA-256. `REPLACE_ME` / `.example` fails forge with `CreateCredentialNoCreateOptionException`. Reference binding that worked: domain `arunnadarasa.github.io`, DAL at `https://arunnadarasa.github.io/.well-known/assetlinks.json`, package `com.choreokits.mobile`.
- **After any `rpId` or assetlinks change: uninstall then reinstall.** `adb install -r` leaves Credential Manager in stale state and the Kuira docs are right — a fresh install is the only reliable reset.
- **Emulator prerequisites BEFORE debugging Credential Manager exceptions:** a signed-in Google account on the device, a screen lock set, and DAL live + package/SHA matched. Skip any of these and passkey create silently cancels no matter how correct your app code is.
- **Force the soft keyboard on:** `adb shell settings put secure show_ime_with_hard_keyboard 1` plus Gboard (`LatinIME`). Hardware/host keyboard input silently fails on Compose fields and Google WebView (`inputType=0`); `adb input text` paints characters that JS validation ignores.
- **NIGHT funding on Undeployed is a CLI airdrop, not an in-app faucet.**
  ```bash
  mn airdrop 10000 --wallet <mn_addr_undeployed1…> --network undeployed
  ```
  Then **Register dust in-app** (the Kuira flow, NOT `mn dust register`).
- **Never OCR / retype addresses from screenshots.** `l` vs `1` in bech32 breaks the checksum (`Invalid checksum… expected "2xmr28"`) and burns an airdrop. Copy from the app UI, or scrape via `adb exec-out uiautomator dump /dev/tty` and parse the `mn_addr_…` substring.
- **Kuira wallet UI uses `FLAG_SECURE` — `screencap` returns black frames.** Use `uiautomator dump` for automation instead of screenshots.

### Form-enablement pattern (real app bug we hit)

Symptom: Publish/Deploy button stayed disabled with all TextFields visibly filled, showing "Enter a kit title" despite a title being typed. Cause: enablement gate read a different piece of state than the TextField `value`. Fire-and-forget `viewModel.foo()` that only reads `.value` doesn't observe recompositions.

Fix pattern (used in `KitsCard.kt` / `KitsViewModel.kt`):

```kotlin
// Local rememberSaveable form state = source of truth
var title by rememberSaveable { mutableStateOf("") }
// Write-through to VM so business logic sees it
LaunchedEffect(title) { vm.setTitle(title) }
// Derive enabled from the SAME state the TextField writes
val blocked = publishBlockedReason(title, steps, priceDust)
Button(enabled = blocked == null, onClick = { vm.publish() }) { … }
```

### Verified happy path

```bash
# Host
mn localnet up
export JAVA_HOME="$(/usr/libexec/java_home 2>/dev/null || echo /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home)"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
./gradlew :app:installDebug

# Emulator (one-time)
# - Sign into a Google account (type password on the soft keyboard)
# - Set a screen lock
# - adb shell settings put secure show_ime_with_hard_keyboard 1

# In-app
# 1. Forge Sigil (passkey create)
# 2. Receive → copy mn_addr_undeployed1…
mn airdrop 10000 --wallet <addr> --network undeployed
# 3. Register dust in-app
# 4. Deploy catalog (on-device prove, ~30–120s cold)
# 5. Title / steps / priceDust → Publish kit
```

### Failure modes specific to Kuira / Android

| Symptom | Cause | Fix |
| --- | --- | --- |
| `CreateCredentialNoCreateOptionException` on forge | No signed-in Google account, or no screen lock, or Password Manager unavailable on this image | Sign into Google on the AVD, set a screen lock, prefer a Play Store system image over bare `google_apis` |
| DAL check reports `packageMatchesRpAssetlinks: false` | `assetlinks.json` not hosted, SHA-256 mismatch, or `rpId` still `REPLACE_ME`/`.example` | Publish DAL at `https://<rpId>/.well-known/assetlinks.json` with package + current debug signing SHA; set `PASSKEY_RP_ID` to that domain |
| Passkey create silently canceled after "correct" DAL fix | Credential Manager cached old rpId | Full uninstall then reinstall — `adb install -r` is not enough |
| `mn airdrop` returns `Invalid checksum… expected "…"` | Address retyped from screenshot; `l` vs `1` collision | Copy address from device UI or scrape with `uiautomator dump` |
| Publish button stays disabled with fields visibly filled | Enablement reads different state than TextField writes | Local `rememberSaveable` + write-through `LaunchedEffect`; derive `enabled` from the same state |
| `screencap` frames are black | Kuira wallet UI has `FLAG_SECURE` | Use `uiautomator dump /dev/tty` for automation |
| `adb input text` fills email/password but Google says "empty" | JS/WebView validation doesn't fire on injected input | Use on-screen Gboard; do not script Google auth via adb |
| `adb: command not found` on macOS | Unity's Android SDK `platform-tools` not on PATH | `export PATH="$ANDROID_HOME/platform-tools:$PATH"` (or Unity SDK path) |
| Gradle fails with cryptic JAVA_HOME error | Stale Corretto/JDK path | `export JAVA_HOME="$(/usr/libexec/java_home)"` — this build was verified on Homebrew OpenJDK 17 |
| Emulator OOM on 8GB host running headless | Kuira + AVD memory pressure | Run the emulator with GUI window; avoid `-no-window` on 8GB machines |

### Anti-patterns (Kuira-specific, add to the main list)

- Don't substitute the Docker `midnight-node:0.22.5` stack for `mn localnet` under Kuira — the SDK expects the `mn` CLI toolchain and its funding semantics.
- Don't automate Google account recovery / security codes via chat. Codes expire in ~60s and "Code 1 / Code 2" on the phone is a **number-match tap**, not the 10-digit Security code field.
- Don't ship `emulator-*.png`, `.cursor/debug-*.log`, or ad-hoc `scripts/emu-*.sh` helpers in the repo — clean before commit.
- Don't rely on host-keyboard input for Compose or WebView fields. Force the soft keyboard on from day one.

### Cross-references

- `mn` CLI install and Undeployed prerequisites: see `midnight-environment-setup`.
- The four-app Fly.io topology from the earlier flymidnight section is still valid as the indexer/proof backend if you'd rather host than run `mn localnet` on a laptop — point the Kuira SDK config at `https://choreo-indexer.fly.dev/api/v4/graphql` and `https://choreo-proof.fly.dev` the same way the web demos do.
- Reference build: `https://github.com/arunnadarasa/mobilemidnight` (Tokenized Choreo Kits).
