# Contracts, verification, and the standards that pay off on Arc

## Compiler pinning (verification depends on it)

- Pin `solc@0.8.24` in **devDependencies**, not just referenced by a script.
- Contract pragma: exact `pragma solidity 0.8.24;` — no caret.
- `optimizer: { enabled: true, runs: 200 }` on both compile and verify.

A newer local solc (e.g. 0.8.36) yields bytecode Arcscan cannot reproduce and
verification fails with "Unable to verify" and no diagnostic.

## Blockscout verification (no API key, no plugin)

```js
const compilerversion = "v" + solc.version().split(".Emscripten")[0];
const input = JSON.stringify({
  language: "Solidity",
  sources: { "MoveMarket.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
});
const params = new URLSearchParams({
  module: "contract", action: "verifysourcecode",
  contractaddress: addr,
  contractname: "MoveMarket.sol:MoveMarket",
  compilerversion, optimizationUsed: "1", runs: "200",
  sourceCode: input, codeformat: "solidity-standard-json-input",
  licenseType: "3", constructorArguments: "", autodetectConstructorArguments: "true",
});
await fetch("https://testnet.arcscan.app/api?" + params, { method: "POST" });
```

`Smart-contract verification started` (200) means **queued**, not verified.
Poll `GET /api/v2/smart-contracts/{address}` for `is_verified: true`; first
submission can take a couple of minutes.

If the contract takes constructor args, pass the ABI-encoded args explicitly
rather than relying on autodetect — autodetect fails silently on address args.

## Standards that earned their keep

### ERC-2981 royalties, settled inside `buy()`

Compute the royalty from `royaltyInfo(tokenId, price)` and pay both legs in the
buyer's selected ERC-20 **inside the same transaction**:

```
buy(tokenId):
  (receiver, royaltyAmount) = royaltyInfo(tokenId, price)
  transferFrom(buyer, receiver, royaltyAmount)   // revert "royalty_failed"
  transferFrom(buyer, seller, price - royaltyAmount) // revert "pay_failed"
  safeTransferFrom(seller, buyer, tokenId)
```

Distinct revert strings matter — they are what lets the UI say "the creator
royalty leg failed" instead of "transaction reverted". Show the buyer the
price split (creator vs seller) before they confirm.

### ERC-1271 for agent/treasury authorization

A Circle developer-controlled wallet has no EOA private key you can delegate.
Deploy a small authorizer contract that implements
`isValidSignature(bytes32,bytes) → 0x1626ba7e` and keeps an on-chain allowlist
of agent addresses. Gateway-style actions then verify against the contract, and
authorization can be granted/revoked on-chain without ever exporting a key.

### ERC-721 with off-chain metadata

`tokenURI` points at `ipfs://<cid>`. Compute the UnixFS CIDv1 in the browser
before pinning so the user sees the hash, and warn clearly when the local hash
cannot be matched pre-pin (chunking parameters differ) rather than silently
showing a mismatch.

## Deployment artifacts

One JSON per contract in `src/data/`:

```json
{ "address": "0x…", "deployTx": "0x…", "abi": [ … ],
  "chainId": 5042002, "network": "Arc Testnet",
  "explorer": "https://testnet.arcscan.app" }
```

The UI imports these directly, so a redeploy is a data change, not a code
change. Agree the shape before the first deploy — changing it later means
touching every panel.
