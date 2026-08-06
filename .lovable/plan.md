# Wire the remaining simulated flows for on-chain

Today H2H, H2A and A2A already produce real Arc transactions: the Privy wallet signs, `/api/public/purchase` verifies the tx receipt on Arc, and the receipt links to Arcscan. Three things are still illustrative:

1. **A2H payout inbox** — the feed in `src/components/a2h/a2h-feed.ts` is a hardcoded array with an invented tx hash (`0x9a3f1c…752a`). Nothing is sent, nothing is verifiable.
2. **AP2 mandates** — signed as `"signature": "demo:none"` in `src/lib/ap2.ts` and `/api/public/a2a/message`.
3. **UCP signing key** — `/api/public/ucp/discovery` publishes a stub JWK (`"x": "demo-public-key-stub-for-hackathon-demo-only"`).

Also, no flow currently writes to the deployed `DanceMoveTokens` registry (`0x4d13…65f0`), so the "on-chain rights record" is deployed but empty.

## What gets built

### 1. Circle treasury sender (server-side)

A new server-only module that lets the Rights Agent move value **without the human signing** — the whole point of A2H.

- Fresh entity-secret ciphertext per request (RSA-OAEP against Circle's public key, re-encrypted every call).
- `transfer(token, to, amount)` → `POST /v1/w3s/user/transactions/transfer` for USDC (native gas token) and a contract-execution call for EURC / cirBTC `transfer()`.
- Poll the Circle transaction until `state: COMPLETE`, return the real `txHash`.
- Uses the already-configured `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `CIRCLE_TREASURY_WALLET_ID`, `CIRCLE_TREASURY_ADDRESS`.

### 2. A2H payouts become real transactions

- The Rights Agent pushes a payout to the **connected Privy wallet address**, in the currently selected token, honouring the AP2 mandate caps (per-payout, daily).
- Inside cap → auto-sent, card shows the real hash and a live Arcscan receipt.
- Above cap → stays as an approval request; pressing **Approve payout** fires the real treasury transfer and the card flips to a settled receipt with its hash.
- **Decline** records a refusal in the protocol envelope; nothing is sent.
- Amounts stay testnet-small (same `DEMO_SCALE` discipline) so the funded treasury lasts through judging.
- If the treasury is unfunded or Circle errors, the card shows the actual failure reason instead of a fake receipt — no silent fallback to a made-up hash.

### 3. Inbox history read from chain

- Every completed payout is also written to the `DanceMoveTokens` registry via `log(token, amount, cid)` from the treasury wallet, so the move CID, token and amount land in an on-chain event.
- The inbox loads its history by reading `Logged` events with `eth_getLogs` through the existing `/api/public/arc-rpc` proxy, newest first, instead of a hardcoded array. The seeded copy stays only as the empty-state / narrative header.

### 4. Real protocol signatures

- Generate an Ed25519 signing key held as a project secret; AP2 Intent / Cart / Payment mandates get a real detached signature over their canonical JSON instead of `demo:none`.
- `/api/public/ucp/discovery` publishes the matching **public** JWK, so the RFC-9421 / AP2 verification path a judge runs actually verifies.

## Technical notes

- New: `src/lib/circle.server.ts` (entity secret + transfer + poll), `src/lib/a2h.functions.ts` (`pushPayout`, `approvePayout`, `listPayouts`), `src/lib/mandate-sign.server.ts`.
- Changed: `src/components/a2h/a2h-feed.ts` (chain-backed feed + envelope builders), `A2hHome.tsx` / `InboxCard.tsx` (pending / sending / settled / failed states), `src/lib/ap2.ts`, `src/routes/api/public/ucp/discovery.ts`, `src/routes/api/public/a2a/message.ts`.
- All Circle and key material is read inside handler bodies only; nothing reaches the client bundle.
- One new secret will be requested: an Ed25519 private key for mandate signing (generated, no user typing).
- Verification: send one live payout on Arc Testnet, confirm the hash resolves on Arcscan, confirm the registry `Logged` event appears, and confirm the inbox renders it after reload.

## Out of scope

- Changing H2H / H2A / A2A settlement, which is already on-chain.
- Mainnet, CCTP bridging, or replacing Shopify as the catalog.
