# Circle SCP + developer-controlled wallets on Arc

Everything below runs on plain `fetch` + Web Crypto inside a Cloudflare Worker.
Do **not** install `@circle-fin/developer-controlled-wallets` or
`@circle-fin/smart-contract-platform` — they pull Node-only deps and break the
Worker build (blank 500, `[unenv] … is not implemented yet!`,
`__dirname is not defined`). This was tried, reverted, and is the single most
expensive mistake available on this stack.

Base URL: `https://api.circle.com/v1/w3s` · blockchain id: `ARC-TESTNET`.

## Entity secret — the write-once traps

The entity secret is the root of every developer-controlled wallet operation.
It is **write-once per Circle account** and Circle never reveals it back.

1. **Persist the raw 32-byte hex to disk BEFORE any network call.** Codify it:

   ```js
   const raw = crypto.randomBytes(32).toString("hex");
   fs.writeFileSync("circle-entity-recovery.json", JSON.stringify({ raw }, null, 2), { flag: "wx" });
   // ONLY THEN encrypt + register
   ```

2. **Registration is `POST /v1/w3s/config/entity/entitySecret`**, not `PUT`
   (the doc generator sometimes shows `PUT`; it 404s).
3. **Expect `409 already registered` even on a brand-new account.** Circle's
   onboarding pre-primes the entity. Do not chase this with more new accounts —
   go through Console → Configurator and paste your own base64 ciphertext.
4. **The recovery blob Circle returns is not the entity secret.** Pasting it
   into `CIRCLE_ENTITY_SECRET` yields `invalid entity secret`.
5. A new API key on the same account inherits the same registered secret.

## Per-request ciphertext (required)

Circle rejects reused ciphertext, so encrypt fresh on every call:

```ts
async function entitySecretCiphertext(): Promise<string> {
  const res = await fetch(`${API}/config/entity/publicKey`, { headers: headers() });
  const pem = (await res.json()).data.publicKey;
  const key = await crypto.subtle.importKey(
    "spki", pemToDer(pem), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"],
  );
  const cipher = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" }, key, hexToBytes(process.env.CIRCLE_ENTITY_SECRET!),
  );
  return btoa(String.fromCharCode(...new Uint8Array(cipher)));
}
```

`crypto.subtle` + `atob`/`btoa` are available in workerd; `node:crypto`'s
RSA path is not reliable there.

## Shared POST envelope

Every developer transaction needs all four of these or you get an opaque 400:

```ts
{
  idempotencyKey: crypto.randomUUID(),
  entitySecretCiphertext: await entitySecretCiphertext(),
  walletId: process.env.CIRCLE_TREASURY_WALLET_ID,
  feeLevel: "MEDIUM",            // string. NEVER a { gasPrice } / EIP-1559 object
  ...body,
}
```

`feeLevel: "MEDIUM"` is the fix for the `gasPrice` validation error on Arc.

### Transfer

`POST /developer/transactions/transfer`

```ts
{ destinationAddress, amounts: ["0.001"], blockchain: "ARC-TESTNET",
  tokenAddress /* omit for native USDC gas token */ }
```

Amounts are **decimal strings**, not atomic units — the opposite convention
from viem, and an easy 1e6 error.

### Contract call

`POST /developer/transactions/contractExecution`

```ts
{ contractAddress, abiFunctionSignature: "log(address,uint256,string)", abiParameters: [...] }
```

### Deploy (SCP)

`POST /contracts/deploy` — the body must include `name`, `walletId`,
`blockchain: "ARC-TESTNET"`, `abiJson: JSON.stringify(abi)` (**string**, not
the array), `bytecode: "0x…"`, `constructorParameters: []`, `feeLevel`,
`idempotencyKey`, `entitySecretCiphertext`. Then poll
`GET /contracts/{contractId}` until `data.contract.status === "COMPLETE"`;
the address is at `data.contract.contractAddress`.

## Polling transactions

`GET /transactions/{id}` every ~2.5s up to ~90s. Return once `txHash` exists
and state is `SENT` / `CONFIRMED` / `COMPLETE`. Throw on `FAILED`,
`CANCELLED`, `DENIED`, surfacing `transaction.errorReason` — that field is the
only signal you get for gas exhaustion.

## Error mapping

Raw Circle strings are unusable in a UI. Map them, and always include the
short raw text as a collapsible `detail`:

| Raw signal | User-facing copy |
| --- | --- |
| `insufficient funds` / `gas required exceeds` | "Not enough USDC for gas on Arc. Top up at faucet.circle.com." |
| `circle_tx_failed:*` with an errorReason | The reason, plus treasury address + balance |
| `missing_secret:CIRCLE_*` | Fall back to demo mode, flag `simulated: true` |
| timeout | "Still pending on Arc — check the treasury on Arcscan." |

## Secrets

`CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET` (64-hex),
`CIRCLE_TREASURY_WALLET_ID`, `CIRCLE_TREASURY_ADDRESS`. All server-only, read
inside handlers — never at module scope, and never with a `VITE_` prefix.
