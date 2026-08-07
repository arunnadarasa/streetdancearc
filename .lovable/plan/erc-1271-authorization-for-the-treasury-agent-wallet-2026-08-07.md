# ERC-1271 authorization for the treasury/agent wallet

Today every agent authorization StreetRail issues is an off-chain Ed25519 mandate signature (`mandate-sign.server.ts`), and value only moves because the Circle-controlled treasury wallet signs a transaction. Nothing on Arc can verify "this agent was authorized by the treasury" without an EOA delegate holding a key.

This adds a smart-contract authorizer that answers `isValidSignature` on-chain, so Circle Gateway (and any ERC-1271-aware counterparty) can accept treasury authorization without an EOA delegate.

## What gets built

1. **`contracts/StreetRailAuthorizer.sol`** (~90 lines, same style as `DanceMoveTokens.sol`)
   - Owner = the Circle treasury wallet address.
   - `isValidSignature(bytes32 hash, bytes signature) returns (bytes4)` — returns the ERC-1271 magic value `0x1626ba7e` when the signature recovers to the owner **or** to a currently-valid delegate.
   - Delegate registry: `grant(address delegate, uint64 expiry, uint256 maxPerAuthUsd6)` / `revoke(address)`, owner-only, with events so the UI can read history from Arc.
   - Pre-approved digest path: `approveHash(bytes32)` / `revokeHash(bytes32)` so the treasury can bless a specific Gateway payload with a transaction instead of a signature — this is the "no EOA delegate at all" route.
   - Events: `DelegateGranted`, `DelegateRevoked`, `HashApproved`, `HashRevoked`.

2. **Deploy + verify** — reuse the existing scripts: `scripts/deploy-arc.mjs` (solc compile, Circle SCP deploy from the treasury wallet) and `scripts/verify-arc.mjs` (Blockscout). Record the address next to the existing registry address in `src/lib/tokens.ts` / config so the UI can link to Arcscan.

3. **Server side (`src/lib/erc1271.server.ts`)**
   - `authorizerAddress()`, `computeAuthHash(payload)` — EIP-712-style digest over the canonical mandate JSON already produced by `canonical()` in `mandate-sign.server.ts`, so one payload has both an Ed25519 mandate and an on-chain hash.
   - `approveAuthOnChain(payload)` — Circle SCP contract execution of `approveHash`, reusing `circle.server.ts`.
   - `verify1271(hash, signature)` — read-only `isValidSignature` call over the existing Arc RPC proxy; used to prove the authorization is live.

4. **A2H wiring (`a2h-engine.server.ts`)**
   - Mandates gain an `onChainAuth` block: `{ authorizer, hash, txHash, receiptUrl, magicValue }`.
   - Renew-mandate flow also approves the new digest on-chain, so an expiring mandate is revoked/re-approved on Arc rather than only in memory.

5. **Public surface**
   - `GET /api/public/erc1271/authorizer` — authorizer address, chain (`eip155:5042002`), owner, active delegates, supported magic value. Lets a Gateway/counterparty agent discover the contract-wallet authorization path.
   - Advertise it in the existing UCP/agent-card discovery documents.

6. **UI** — a compact "Contract authorization" row in the A2H payout card and the Circle Rails panel: authorizer address linked to Arcscan, digest, `isValidSignature` result (valid / expired / not approved), and the approving tx hash.

## Notes

- No new secrets; deployment uses the funded Circle treasury wallet already configured.
- Existing Ed25519 mandates stay — ERC-1271 is added alongside, not as a replacement, so nothing breaks if the contract is unreachable (UI degrades to "off-chain mandate only").
- Contract stays under 100 lines to match the deploy pipeline's constraints.
