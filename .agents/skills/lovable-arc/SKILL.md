---
name: lovable-arc
description: "Ship a Lovable single-page dApp on Circle's Arc Testnet — Privy embedded wallet with USDC as native gas, Circle SCP contract deploy from a developer-controlled treasury wallet, Arcscan/Blockscout source verification, and multi-stablecoin (USDC/EURC/cirBTC) payment UX. Captures Arc-specific quirks including chain id 5042002, 6-decimal native gas, the VITE_ secret-prefix ban in Lovable, and Circle entity-secret onboarding traps. Triggers on Arc Testnet, Arcscan, arc.io, USDC gas, Circle SCP deploy on Arc, cirBTC, EURC on Arc."
---

# Lovable · Arc Testnet

Testnet-only. Everything below is what actually broke shipping an Arc demo on
Lovable. Skip anything that "should just work" per the generic Circle/Arc docs.

For the broader Circle/CCTP/UCP layers see `dance-ucp-arc-circle`. This skill
owns the **Lovable × Arc** delta: chain constants, Privy wiring, the
`VITE_*` secret trap, Circle SCP deploy payload shape, and Arcscan verify.

## Chain constants (copy verbatim)

| Thing | Value |
| --- | --- |
| chainId | `5042002` |
| CAIP-2 | `eip155:5042002` |
| Native gas token | **USDC** (6 decimals — not 18) |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` (Blockscout under the hood) |
| USDC | Native — the fee token IS USDC |
| EURC | See Arc docs; pass as ERC-20 for payments (not gas) |
| cirBTC | See Arc docs; pass as ERC-20 for payments (not gas) |
| Faucet | `https://faucet.circle.com/` → pick "Arc Testnet" |
| Circle blockchain id | `ARC-TESTNET` |

Viem chain definition (`src/lib/arc-chain.ts`):

```ts
import { defineChain } from "viem";
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});
```

**decimals: 6 is non-negotiable.** Wallets that hardcode 18-decimal native
balances will show wildly wrong amounts.

## The `VITE_*` secret-prefix trap (Lovable-specific)

Lovable's managed secrets API **rejects any name starting with `VITE_`** —
that prefix is reserved for the build system. Symptoms: `add_secret`/
`update_secret` returns an error like "reserved prefix" and the value never
lands in `import.meta.env`.

Workaround (used for `PRIVY_APP_ID`, `CIRCLE_TREASURY_ADDRESS`, etc.):

1. Save under a non-`VITE_` name (`PRIVY_APP_ID`, not `VITE_PRIVY_APP_ID`).
2. Expose to the client via a TanStack route loader that reads
   `process.env.NAME` on the server:

   ```ts
   // src/routes/index.tsx
   export const Route = createFileRoute("/")({
     loader: () => ({
       privyAppId: process.env.PRIVY_APP_ID ?? "",
       treasuryAddress: process.env.CIRCLE_TREASURY_ADDRESS ?? "",
     }),
     component: Home,
   });
   ```

3. Read with `Route.useLoaderData()` and pass down as props. Never rely on
   `import.meta.env.VITE_*` for values that must live in the secret store.

Publishable/anon keys that DON'T need the store (like a Shopify Storefront
token) can still ship in code — see the general secrets rules.

## Circle entity secret — the onboarding traps

The entity secret is the root of every Circle developer-controlled wallet
operation. It is **write-once per Circle entity (account/org)** and Circle
never reveals it back. Every trap below cost real hours in this session:

1. **Registration is `POST`, not `PUT`.** The doc-generator sometimes shows
   `PUT /v1/w3s/config/entity/entitySecret` — that returns 404. Use `POST`.
2. **Register in the Console, not the API, when the API returns 409.**
   Circle's new-account onboarding auto-primes the entity so the very first
   API call `POST /v1/w3s/config/entity/entitySecret` returns
   `409 already registered` even on a brand-new key. The fix: mint a 32-byte
   hex secret locally, RSA-OAEP encrypt it against
   `GET /v1/w3s/config/entity/publicKey`, and paste the resulting **base64
   ciphertext** into Console → Configurator → "Entity Secret Ciphertext".
3. **Save the raw hex to disk BEFORE any network call.** If registration
   succeeds and you didn't persist the hex, the wallet set is unrecoverable.
   The bootstrap script must `fs.writeFileSync` first, then submit.
4. **Recovery file ≠ entity secret.** The blob Circle returns on registration
   is an encrypted recovery envelope, not the 64-hex secret. Do not paste it
   into `CIRCLE_ENTITY_SECRET`.
5. **One entity secret per account.** A "new API key" on the same Circle
   account inherits the same registered entity secret. Only a fresh Circle
   sandbox account (different email) resets the write-once slot.

## Circle SCP deploy — payload shape that actually works

`POST https://api.circle.com/v1/w3s/contracts/deploy` — the request body
MUST include all of the following or the API returns validation errors that
look like generic 400s:

```ts
{
  idempotencyKey: crypto.randomUUID(),           // required
  name: "DanceMoveTokens",
  walletId: process.env.CIRCLE_TREASURY_WALLET_ID,
  blockchain: "ARC-TESTNET",
  abiJson: JSON.stringify(abi),                  // STRING, not the array
  bytecode: "0x" + hexBytecode,
  constructorParameters: [],                     // positional
  feeLevel: "MEDIUM",                            // string, not an object
  entitySecretCiphertext: freshCiphertext(),     // re-encrypt every call
}
```

Then poll `GET /v1/w3s/contracts/{contractId}` until
`data.contract.status === "COMPLETE"`. The address lands at
`data.contract.contractAddress`.

The entity-secret ciphertext must be **freshly encrypted for every request**
using a per-request `publicKey` fetch. Circle rejects reused ciphertext.

## Solidity compiler version — must match Arcscan's list

Arcscan (Blockscout) verify fails with `Unable to verify` whenever the
deployed bytecode's compiler version isn't in Blockscout's supported list.
In this session, the local `solc` was `0.8.36` but the contract pragma was
`^0.8.24` — Arcscan accepted the metadata but couldn't reproduce the
bytecode from source. Fix:

- Pin `solc` in the deploy script to a version Arcscan explicitly lists
  (0.8.24 is safe today). Do NOT rely on the system-installed compiler.
- Match `optimizer.runs` between deploy and verify (200 is the safe default).
- Deploy with a pragma that pins exactly (`pragma solidity 0.8.24;` rather
  than `^0.8.24`) so the verifier picks the right build.

## Arcscan / Blockscout verification

Use the standard-JSON endpoint, not flattened source:

```
POST https://testnet.arcscan.app/api/v2/smart-contracts/{address}/verification/via/standard-input
{
  "compiler_version": "v0.8.24+commit.e11b9ed9",
  "license_type": "mit",
  "is_optimization_enabled": true,
  "optimization_runs": 200,
  "contract_name": "path/to/File.sol:ContractName",
  "files": { "File.sol": "<source>" }
}
```

`Smart-contract verification started` (200) means it's queued, not verified.
Poll `GET /api/v2/smart-contracts/{address}` and read `is_verified` for the
truthy transition. Give it a few minutes on first submission.

## Privy on Arc

- `defaultChain: { id: 5042002, name: "Arc Testnet" } as never` — the Privy
  type is narrow; the cast is required.
- Wrap the Privy provider in `<ClientOnly>` + `React.lazy()` — same rule as
  every other Lovable Privy skill. Workerd crashes on static import of
  `@privy-io/react-auth`.
- Gas sponsorship is NOT needed on Arc because USDC IS the gas token. Fund
  the embedded wallet from the Circle faucet and Privy signs normally with
  no paymaster policy.

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `add_secret` rejects `VITE_PRIVY_APP_ID` | `VITE_*` prefix is reserved | Save as `PRIVY_APP_ID`, expose via route loader |
| Circle 409 on brand-new API key | Onboarding auto-primed entity | Register via Console with your own ciphertext |
| `invalid entity secret` after paste | User pasted the recoveryFile blob | Paste the 64-hex raw secret instead |
| SCP deploy 400 | Missing `idempotencyKey` or `abiJson` sent as array | Send UUID + `JSON.stringify(abi)` |
| Deploy hangs forever | Polling wrong status field | Wait for `contract.status === "COMPLETE"` |
| Arcscan "Fail - Unable to verify" | Local solc newer than Arcscan's list | Redeploy with pinned solc 0.8.24 |
| Wallet shows 18-dec native balance | Chain def defaulted to 18 decimals | `nativeCurrency.decimals: 6` in viem chain |
| Privy modal asks for ETH | User forgot Arc uses USDC gas | Fund treasury/embedded wallet at faucet.circle.com |

## Out of scope

- Arc Mainnet. Mainnet needs real funding and a different faucet story.
- CCTP bridging into/out of Arc — see `dance-ucp-arc-circle`'s Arc/CCTP layer.
- UCP checkout schemas — same skill.
- Non-Circle deploy paths (Hardhat + funded EOA). Doable, but Arc's whole
  UX pitch is "no EOA, USDC gas from a Circle wallet". Use SCP.
