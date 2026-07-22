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
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` (Blockscout under the hood) |
| Faucet | `https://faucet.circle.com/` → pick "Arc Testnet" |
| Circle blockchain id | `ARC-TESTNET` |

**RPC hostname trap.** Circle/Arc docs interleave `rpc.testnet.arc.io` and
`rpc.testnet.arc.network`. The `.network` host is what actually resolves in
this template today; `.io` intermittently DNS-fails. Hardcode `.network` and
override via env var if needed.

### Token addresses (Arc Testnet, verified in-session)

| Token  | Address                                      | Decimals | Notes |
|--------|----------------------------------------------|----------|-------|
| USDC   | `0x3600000000000000000000000000000000000000` | 6        | Native gas token — ALSO an ERC-20 at this address |
| EURC   | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6        | Euro Coin |
| cirBTC | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | 8        | Circle Wrapped BTC — **8 decimals**, not 6 or 18 |

Sources:
- https://developers.circle.com/stablecoins/eurc-contract-addresses
- https://developers.circle.com/assets/cirbtc-contract-addresses

Viem chain definition (`src/lib/arc-chain.ts`):

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
2. **Console-configurator is the reliable path, even on brand-new accounts.**
   Circle's onboarding auto-primes the entity, so the very first API call
   `POST /v1/w3s/config/entity/entitySecret` typically returns
   `409 already registered` even on a fresh sandbox account with a fresh
   API key. Do not chase this with more new accounts — go through Console.
   Mint 32 bytes locally, RSA-OAEP encrypt against
   `GET /v1/w3s/config/entity/publicKey`, and paste the resulting **base64
   ciphertext** into Console → Configurator → "Entity Secret Ciphertext".
3. **Persist the raw hex to disk BEFORE any network call.** If registration
   succeeds and you didn't persist the hex, the wallet set is unrecoverable.
   Codify this in the bootstrap script — do not leave it to prose:

   ```js
   const raw = crypto.randomBytes(32).toString("hex");
   fs.writeFileSync(
     "circle-entity-recovery.json",
     JSON.stringify({ raw }, null, 2),
     { flag: "wx" },        // fail if a prior recovery file exists
   );
   // ONLY THEN encrypt + POST/paste-into-Console
   ```

4. **Recovery file ≠ entity secret.** The blob Circle returns on registration
   is an encrypted recovery envelope, not the 64-hex secret. Do not paste it
   into `CIRCLE_ENTITY_SECRET`.
5. **One entity secret per account.** A "new API key" on the same Circle
   account inherits the same registered entity secret. Only a fresh Circle
   sandbox account (different email) resets the write-once slot — but see
   trap #2: fresh accounts also 409, so plan for Console anyway.

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

## Solidity compiler + verification — the working recipe

Confirmed end-to-end on `0x4d13b45f823f8944522890c20d8695b6005465f0`.

**Deploy side:**
- Pin `solc@0.8.24` in `package.json` **devDependencies** (not just referenced
  in a script). Any newer local `solc` (e.g. `0.8.36`) produces bytecode that
  Arcscan cannot reproduce.
- Contract pragma: **exact** `pragma solidity 0.8.24;` — no caret.
- `optimizer: { enabled: true, runs: 200 }` — match on both ends.

**Verify side** — Blockscout REST, no API key, no plugin:

```js
// scripts/verify-arc.mjs
const compilerversion = "v" + solc.version().split(".Emscripten")[0];
const input = JSON.stringify({
  language: "Solidity",
  sources: { "DanceMoveTokens.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
});
const params = new URLSearchParams({
  module: "contract",
  action: "verifysourcecode",
  contractaddress: addr,
  contractname: "DanceMoveTokens.sol:PaymentDanceMoveTokens",
  compilerversion,
  optimizationUsed: "1",
  runs: "200",
  sourceCode: input,
  codeformat: "solidity-standard-json-input",
  licenseType: "3",
  constructorArguments: "",
  autodetectConstructorArguments: "true",
});
await fetch("https://testnet.arcscan.app/api?" + params, { method: "POST" });
```

`Smart-contract verification started` (200) means queued, not verified. Poll
`GET https://testnet.arcscan.app/api/v2/smart-contracts/{address}` and wait
for `is_verified: true`. First submission can take a couple of minutes.

The Blockscout v2 `via/standard-input` endpoint also works when you prefer a
JSON body over the querystring form; either is fine as long as the payload
carries the standard-JSON input, not flattened source.

## Privy on Arc

- `defaultChain: { id: 5042002, name: "Arc Testnet" } as never` — the Privy
  type is narrow; the cast is required.
- Wrap the Privy provider in `<ClientOnly>` + `React.lazy()` — same rule as
  every other Lovable Privy skill. Workerd crashes on static import of
  `@privy-io/react-auth`.
- Gas sponsorship is NOT needed on Arc because USDC IS the gas token. Fund
  the embedded wallet from the Circle faucet and Privy signs normally with
  no paymaster policy.

### Approval-modal UX gotcha (users WILL be confused)

When your app calls `approve()` on EURC or cirBTC, Privy's confirmation modal
shows the wallet's **gas-token balance** (USDC on Arc), and the "Approval
amount" row renders **blank**. This is not a bug in your code:

- The balance line is always the gas token, regardless of which ERC-20
  contract the tx is targeting. On Arc that's USDC.
- Privy auto-formats amounts only for tokens it has metadata for. It has
  none for EURC/cirBTC on Arc, so the raw uint256 stays unrendered.

Compensate in **your** UI, since Privy's modal is out of your control:

1. Render a pre-confirmation summary above the confirm button:
   "You'll approve `{amount} {symbol}` to be spent by `{contractName}`.
   Token: `0xABCD…1234`." Match the short address to the `Token address`
   line Privy shows lower in its modal so users can cross-check.
2. If a token's address is the zero address (env var unset, e.g.
   `VITE_CIRBTC_ADDRESS` missing), **gate it in the token switcher** —
   disable + strike-through with a hint. Do not let the form silently
   skip the `approve` step and jump straight to the contract call; that
   looks like a bug and confuses users about what got signed.

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `add_secret` rejects `VITE_PRIVY_APP_ID` | `VITE_*` prefix reserved | Save as `PRIVY_APP_ID`, expose via route loader |
| RPC calls fail / DNS error on `rpc.testnet.arc.io` | Wrong hostname | Use `rpc.testnet.arc.network` |
| Circle 409 on brand-new API key | Onboarding auto-primed entity | Register via Console configurator with your own ciphertext |
| `invalid entity secret` after paste | User pasted the `recoveryFile` blob | Paste the 64-hex raw secret instead |
| SCP deploy 400 | Missing `idempotencyKey` or `abiJson` sent as array | Send UUID + `JSON.stringify(abi)` |
| Deploy hangs forever | Polling wrong status field | Wait for `contract.status === "COMPLETE"` |
| Arcscan "Fail - Unable to verify" | Local solc newer than deployed pragma | Pin `solc@0.8.24` in devDependencies; deploy with `pragma solidity 0.8.24;` |
| Wallet shows 18-dec native balance | Chain def defaulted to 18 decimals | `nativeCurrency.decimals: 6` in viem chain |
| Privy modal asks for ETH | Arc uses USDC gas | Fund treasury/embedded wallet at faucet.circle.com |
| Privy modal shows "USDC" while approving EURC/cirBTC | Modal always shows gas-token balance | Render your own pre-confirmation summary; it's not a bug |
| cirBTC "approve" step silently skipped | Address env var unset → token address is `0x000…000` | Gate zero-address tokens in the switcher instead of skipping approve |

## Success checkpoints — you know it worked when…

1. `node scripts/bootstrap-circle.mjs` prints treasury wallet ID + address,
   and `circle-entity-recovery.json` exists on disk BEFORE any network call.
2. Treasury address funded via `faucet.circle.com` → "Arc Testnet" → USDC.
3. `node scripts/deploy-arc.mjs` polls to `status: "COMPLETE"` and writes
   `src/data/contract.json` with `address` + `abi` + `chainId: 5042002`.
4. `node scripts/verify-arc.mjs` returns 200 with `Smart-contract
   verification started`; a minute later `is_verified: true` on the v2
   Blockscout endpoint; Arcscan UI shows the verified checkmark.
5. Google login via Privy provisions an embedded wallet on chain `5042002`;
   an approve + `log(token, amount, cid)` tx confirms on Arcscan under the
   embedded wallet's address.

## Out of scope

- Arc Mainnet. Mainnet needs real funding and a different faucet story.
- CCTP bridging into/out of Arc — see `dance-ucp-arc-circle`'s Arc/CCTP layer.
- UCP checkout schemas — same skill.
- Non-Circle deploy paths (Hardhat + funded EOA). Doable, but Arc's whole
  UX pitch is "no EOA, USDC gas from a Circle wallet". Use SCP.
