# RPC selection and reading history on Arc

## Two endpoints, two jobs

Arc's own public RPC and a paid provider endpoint (Alchemy) have opposite
strengths. Split them:

```ts
const rpcUrl      = () => process.env.ARC_RPC_URL      || "https://rpc.testnet.arc.network"; // writes / calls
const logsRpcUrl  = () => process.env.ARC_LOGS_RPC_URL || "https://rpc.testnet.arc.network"; // eth_getLogs
```

**Alchemy's free Arc endpoint caps `eth_getLogs` at a 10-block range.** Point
it at reads/calls only. The public Arc RPC has no such cap but rate-limits wide
sweeps, so still bound and cache them.

**Never expose either URL to the browser.** `VITE_*` is a banned secret prefix
in Lovable and an Alchemy key in the client is a leak — proxy every RPC call
through a server function or a `src/routes/api/` handler.

## Bounded, chunked, cached log reads

When you must read logs from RPC:

- Cap total lookback at ~5,000 blocks from head (going further is what triggers
  rate limiting, and the collection's first mint is far older anyway).
- Chunk into small windows and detect range rejections by message text —
  providers phrase them differently: `block range`, `range too large`,
  `range should work`, `too many`. On a hit, halve the window and retry.
- Cache results server-side for ~60s. Payout inboxes and activity panels poll,
  and without the cache each mount replays the whole sweep.

## Prefer Arcscan v2 as the indexer

Arcscan is Blockscout, so it exposes a free REST v2 API with full history —
strictly better than an RPC sweep for any "show me everything that happened"
panel. Use it as the primary source and keep the chunked RPC sweep only as a
fallback when the explorer is unreachable.

```
GET https://testnet.arcscan.app/api/v2/addresses/{address}/logs
GET https://testnet.arcscan.app/api/v2/smart-contracts/{address}
GET https://testnet.arcscan.app/api/v2/transactions/{hash}
```

Decode the returned topics/data with viem's `parseAbiItem` + `decodeEventLog`
so both paths produce the same shape. No API key required.

Pattern that worked: one server module owns "market activity", joins
`Listed` / `Cancelled` / `Sold` / `RoyaltyPaid` / ERC-721 `Transfer` into a
single typed timeline, and the UI does search/filter/sort on top of that
already-joined list. Doing the join client-side across four separate log
queries is slow and rate-limits.

## Linking out

Every hash and address in the UI should link to
`https://testnet.arcscan.app/tx/{hash}` / `/address/{addr}`. Judges and users
treat an unlinked hash as unverifiable — linkify hashes even inside rendered
JSON receipt blocks.
