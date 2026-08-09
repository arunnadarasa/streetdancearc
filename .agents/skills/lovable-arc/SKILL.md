---
name: lovable-arc
description: "Ship a Lovable dApp on Circle's Arc Testnet — chain id 5042002 with USDC as 6-decimal native gas, Privy embedded wallets, Circle developer-controlled treasury wallets, Circle SCP contract deploys, Arcscan/Blockscout verification and v2 indexing, ERC-721 + ERC-2981 royalties, ERC-1271 agent authorization, and multi-stablecoin (USDC/EURC/cirBTC) payment UX. Captures Arc-specific traps: the VITE_ secret-prefix ban, Circle entity-secret onboarding, feeLevel vs gasPrice, @circle-fin SDKs breaking the Cloudflare Worker runtime, and Alchemy's 10-block eth_getLogs cap on Arc. Triggers on Arc Testnet, Arcscan, arc.network, USDC gas, Circle SCP, cirBTC, EURC on Arc, Circle treasury wallet."
---

# Lovable · Arc Testnet

Testnet-only. Everything here is what actually broke shipping an Arc app on
Lovable (four contracts, an agent payout engine, an NFT marketplace with
royalties). Skip anything that "should just work" per the generic Circle/Arc
docs — it mostly does; these are the parts that don't.

For CCTP bridging and UCP checkout schemas see `dance-ucp-arc-circle`. For the
SSR-safe Privy mount see `evvm-privy-integration`. This skill owns the
**Lovable × Arc** delta.

## Chain constants (copy verbatim)

| Thing | Value |
| --- | --- |
| chainId | `5042002` |
| CAIP-2 | `eip155:5042002` |
| Native gas token | **USDC** (6 decimals — not 18) |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` (Blockscout under the hood) |
| Faucet | `https://faucet.circle.com/` → "Arc Testnet" (~20 USDC/day) |
| Circle blockchain id | `ARC-TESTNET` |

**RPC hostname trap.** Circle/Arc docs interleave `rpc.testnet.arc.io` and
`rpc.testnet.arc.network`. Only `.network` resolves reliably. Hardcode it as
the default and allow an env override.

### Token addresses (Arc Testnet, verified in-session)

| Token  | Address                                      | Decimals |
|--------|----------------------------------------------|----------|
| USDC   | `0x3600000000000000000000000000000000000000` | 6 (also an ERC-20 at this address) |
| EURC   | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 |
| cirBTC | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | **8** |

Viem chain (`src/lib/arc-chain.ts`):

```ts
import { defineChain } from "viem";
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});
```

`decimals: 6` is non-negotiable — an 18-decimal default renders every balance
as a rounding error.

## Hard rules (each one cost hours)

1. **Never install `@circle-fin/*` SDKs.** They assume Node and crash the
   Cloudflare Worker runtime the app deploys to (`[unenv] … not implemented`,
   `__dirname is not defined`, or a blank 500). Hand-roll `fetch` adapters
   against `https://api.circle.com/v1/w3s`; the whole client is ~150 lines and
   uses only Web Crypto. See `references/circle-scp.md`.
2. **`feeLevel: "MEDIUM"`, never a `gasPrice`/fee object.** Circle rejects
   EIP-1559-style fee payloads on Arc with an opaque 400.
3. **Re-encrypt the entity secret on every request.** Fetch
   `/config/entity/publicKey`, RSA-OAEP(SHA-256) the 32-byte secret, base64 it.
   Reused ciphertext is rejected.
4. **`VITE_*` is a banned secret prefix in Lovable.** Store as `PRIVY_APP_ID`,
   not `VITE_PRIVY_APP_ID`, and surface it through a route loader reading
   `process.env`. Never ship the Alchemy RPC URL to the browser — proxy it.
5. **Alchemy's Arc endpoint caps `eth_getLogs` at 10 blocks** (free tier) and
   rate-limits wide sweeps. Use the public Arc RPC for log reads, chunk the
   window, cap the lookback, and cache. Better: read history from the Arcscan
   v2 REST API. See `references/rpc-and-indexing.md`.
6. **Pin `solc@0.8.24` in devDependencies and use an exact `pragma solidity
   0.8.24;`.** A newer local compiler produces bytecode Blockscout cannot
   reproduce, and verification fails with no useful message.
7. **Wrap Privy in `<ClientOnly>` + `React.lazy()`.** A static import of
   `@privy-io/react-auth` crashes workerd. `defaultChain: { id: 5042002, name:
   "Arc Testnet" } as never` — the Privy type is narrow.
8. **No gas sponsorship needed or available.** USDC *is* gas on Arc; fund the
   embedded wallet from the faucet and sign normally. No paymaster policy.
9. **Write one JSON file per deployed contract** (`address`, `abi`, `chainId`,
   `explorer`, `deployTx`) under `src/data/` and have the UI read it. Deploys
   then go live without a code edit.
10. **Demo-fallback over hard failure.** Every server module must boot with
    zero secrets and return a realistic envelope flagged `simulated: true`.
    Never throw at module scope for missing config.
11. **Agent-demo outcomes come from deterministic code, not prompt wording.**
    Prompts shape the transcript; a post-loop fallback that promotes the best
    in-policy quote guarantees the close. Never let an LLM own your success
    rate. See `references/agent-negotiation.md`.
12. **Any price an LLM emits is untrusted input.** Normalise minor-units vs
    decimals, clamp to `[floor, list]`, and re-derive the charged total from
    the catalog before it reaches a settlement path.

## Reference index

| Read this | For |
| --- | --- |
| `references/circle-scp.md` | Entity secret onboarding, wallet bootstrap, transfer + contractExecution, polling, error mapping |
| `references/rpc-and-indexing.md` | RPC selection, getLogs limits, chunking, caching, Arcscan v2 as indexer |
| `references/contracts-and-verify.md` | solc pinning, Blockscout verify recipe, ERC-721 / ERC-2981 / ERC-1271 on Arc |
| `references/payments-ux.md` | USDC/EURC/cirBTC toggle, decimals, FX, Privy approval-modal gotchas, treasury panel |
| `references/agent-negotiation.md` | Two-agent buyer/seller loops that close: derived budgets, seller floors, final-turn rules, deterministic fallback, quote sanitising |
| `references/failure-modes.md` | Full symptom → cause → fix table |


## What worked well (reuse these)

- **Circle SCP as the only deploy path.** No EOA, no funded private key in
  CI, USDC gas from the treasury wallet. Four contracts shipped this way.
- **ERC-1271 authorizer contract** so agent/treasury actions are authorized by
  a contract signature instead of an EOA delegate key.
- **ERC-2981 royalties enforced inside the marketplace `buy()`**, atomically,
  in whichever payment token the buyer selected — a separate royalty leg that
  can fail independently is a worse demo and a worse product.
- **Off-chain session ledger that batches nano-amounts** and settles to Arc at
  a threshold (~$0.50). A 20 USDC/day faucet then survives a full day of demos;
  size each unit at ~$0.001.
- **Arcscan v2 REST as the indexer** for activity/receipt panels — free, full
  history, no client-side log scan.
- **Client-side UnixFS CIDv1 computation** before pinning, so the user sees the
  content hash and can verify the pin matched.
- **A human-readable error mapper** (`mapChainError`) between chain/Circle
  errors and UI copy. Retrofitting this late was the single biggest time sink.

## What I'd do differently next time

1. Build the **indexer read path and the error mapper on day one**. Both were
   retrofitted after users hit rate limits and opaque 400s.
2. Decide the **contract JSON artifact shape before the first deploy** —
   redeploys are cheap, but three UI refactors to chase a changed shape are not.
3. Treat **treasury gas as a first-class UI concern** from the start: address,
   balance, and a `lowGas` warning. Payout failures otherwise look like bugs.
4. Sketch the **multi-token decimal matrix** (6/6/8) once, in one `TOKENS`
   table, instead of discovering cirBTC's 8 decimals via a wrong balance.
5. Build the **deterministic negotiation fallback before tuning any prompt**.
   Days went into prompt wording for a two-agent demo that a 15-line
   best-in-policy promotion fixed outright.


## Success checkpoints

1. `bootstrap-circle.mjs` prints treasury wallet id + address, and the raw
   entity-secret hex is on disk **before** any network call.
2. Treasury funded at `faucet.circle.com` → Arc Testnet.
3. `deploy-arc.mjs` polls to `status: "COMPLETE"` and writes
   `src/data/<contract>.json` with `address` + `abi` + `chainId: 5042002`.
4. `verify-arc.mjs` returns 200; a minute later `is_verified: true` on
   `https://testnet.arcscan.app/api/v2/smart-contracts/{address}`.
5. Google login via Privy provisions an embedded wallet on 5042002 and a real
   tx confirms on Arcscan under that address.

## Out of scope

Arc Mainnet. CCTP bridging (`dance-ucp-arc-circle`). UCP checkout schemas
(same skill). Hardhat + funded-EOA deploys — Arc's pitch is "no EOA, USDC gas
from a Circle wallet"; use SCP.
