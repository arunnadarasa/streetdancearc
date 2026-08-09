# Arc on Lovable — failure modes

| Symptom | Cause | Fix |
|---|---|---|
| App returns a blank 500 after adding Circle features | `@circle-fin/*` SDK pulled Node-only deps into the Worker | Remove the SDK; hand-roll `fetch` + Web Crypto against `api.circle.com/v1/w3s` |
| `[unenv] X is not implemented yet!` / `__dirname is not defined` | Node-only package in the Worker bundle | Replace with a Worker-safe library or a plain HTTP call |
| `add_secret` rejects `VITE_PRIVY_APP_ID` | `VITE_*` is a reserved prefix in Lovable | Save as `PRIVY_APP_ID`, expose via a route loader reading `process.env` |
| DNS failure on `rpc.testnet.arc.io` | Wrong hostname in Circle/Arc docs | Use `rpc.testnet.arc.network` |
| Circle 409 on a brand-new API key | Onboarding pre-primed the entity secret | Register through Console → Configurator with your own base64 ciphertext |
| `invalid entity secret` after pasting | Pasted the recovery blob, not the 64-hex secret | Use the raw hex you persisted before registration |
| SCP deploy 400 | Missing `idempotencyKey`, or `abiJson` sent as an array | Send a UUID + `JSON.stringify(abi)` |
| Circle tx 400 mentioning `gasPrice` | Sent an EIP-1559/fee object | `feeLevel: "MEDIUM"` (string) |
| Circle rejects the ciphertext | Reused a previous ciphertext | Re-encrypt per request against a freshly fetched public key |
| Deploy hangs forever | Polling the wrong field | Wait for `data.contract.status === "COMPLETE"` |
| `eth_getLogs` errors after ~10 blocks | Alchemy free-tier Arc cap | Use the public Arc RPC for logs; chunk + shrink the window on range errors |
| RPC rate-limit errors in a payout/activity panel | Unbounded lookback and polling remounts | Cap lookback (~5,000 blocks), cache results ~60s, prefer Arcscan v2 |
| Activity panel misses old events | RPC window can't reach the first mint | Read history from the Arcscan v2 REST API, keep RPC as fallback |
| Arcscan "Unable to verify" | Local solc newer than the deployed pragma | Pin `solc@0.8.24` in devDependencies; exact pragma; matching optimizer runs |
| Verification "started" but never verified | Queued, not finished | Poll `/api/v2/smart-contracts/{address}` for `is_verified: true` |
| Wallet shows an 18-decimal native balance | Chain def defaulted to 18 | `nativeCurrency.decimals: 6` in the viem chain |
| cirBTC balance off by 100× | Hardcoded 1e6 conversion | Read decimals from the `TOKENS` table (cirBTC is 8) |
| Privy modal shows USDC while approving EURC/cirBTC | Modal always shows the gas token | Render your own pre-confirmation summary — not a bug |
| Approve step silently skipped | Token address env unset → zero address | Gate zero-address tokens in the switcher |
| Privy modal asks for ETH | Arc gas is USDC | Fund the wallet at `faucet.circle.com` → Arc Testnet |
| Privy crashes SSR / workerd | Static import of `@privy-io/react-auth` | `<ClientOnly>` + `React.lazy()` |
| Payout fails with an opaque error | Treasury out of USDC gas | Surface treasury address + balance + `lowGas` warning; refill at the faucet |
| Faucet drained mid-demo | Per-payout amounts too large | ~$0.001 units, off-chain batching, settle at ~$0.50 |
| CoinGecko 401 | Demo key sent to the pro host | Demo host + `x-cg-demo-api-key` header; keep a static fallback rate |
| "Claim"/action looks on-chain but isn't | UI-only state | Anchor it with a real contract call and show the Arcscan link |
| Mode/tab switch does nothing on the published site | Mode mapping duplicated across routes | Centralise mode → surface mapping in one component |
| Agent negotiation always ends in a refusal | Budget hardcoded in the goal string, below every catalog price | Derive the budget from the live catalog at request time (cheapest in-policy item + headroom) |
| Seller agent refuses instead of countering | Prompt only gave it a list price | Render `listUsd` + `floorUsd` and forbid flat refusals — discount or substitute |
| Quote total off by ~1e6 | LLM returned minor units, not decimals | Normalise + clamp in code; re-derive the charged total from the catalog |
| Run ends with no quote and no explanation | No-deal outcome not modelled | Return `{ accepted: false, reason }` and render the reason next to the transcript |
