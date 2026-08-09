# StreetRail

Streetwear commerce and private-by-default choreography rights on **Midnight Local Undeployed**. Humans and agents share the same catalog; move anchoring, MoveNft rights, and experimental mUSDC settlement use Compact contracts, witnesses, and ZK commitments — not a public EVM rail.

Live demo: https://streetrail.lovable.app  
Source: https://github.com/arunnadarasa/streetdancearc

## What it demonstrates

| Compact contract | Role / privacy model |
| --- | --- |
| `MoveRegistry` | Log a move CID; `witness localSecretKey()` stays off-chain; public ledger stores a `persistentHash` **author commitment** + disclosed CID/message |
| `MoveNft` | Mint / list / buy / transfer move rights; ownership + listings are public maps; **mUSDC settle is sequenced by the server** before `buy` |
| `MidnightUSDC` | Experimental mUSDC mimic; signer key is a witness (`musdc:signer:v1`); spent nonces + balances are public |
| `MandateVault` | Buyer secret derives `ap2:buyer:v1` public key in-circuit; secret never enters the ledger |
| `OrderLedger` | Merchant signing-key fingerprint via `ucp:merchant:v1` witness |

Undeployed writes use a genesis **server-append** path (Lace cannot sign on Undeployed). Reads go through the local indexer GraphQL API.

Deployed addresses are written to `src/data/midnight-contract.json` / `midnight-contract.undeployed.json` under `contracts.moveRegistry`, `moveNft`, `midnightUsdc`, `mandateVault`, and `orderLedger`.

## Product surfaces

| Route | What you do |
| --- | --- |
| `/moves` | **Prove & mint move NFT** — `POST /api/public/append-entry` then `POST /api/public/move-nft-mint` |
| `/market` | **MidnightMoveMarketPanel** — list, cancel, buy, transfer Compact MoveNfts; settle listed buys in experimental mUSDC |
| `/shop` | Merch cart checkout via experimental mUSDC / x402 server settle |

The Arc ERC-721 Move Market (`DanceMoveTokens` / `MoveMarket.sol`) is **paused** on this Undeployed product path. Use the Midnight Compact market on `/market`.

## Prerequisites

- Node.js ≥ 22
- [bun](https://bun.sh)
- Docker Desktop (or compatible Compose v2)
- [Compact toolchain](https://docs.midnight.network) (`compact` CLI)

## Quick start

```bash
bun install
bun run compile   # compact compile → copy artefacts → docker compose up → deploy
bun run dev
```

Open the app, connect Lace on **Undeployed** (optional — Undeployed writes go through server-append), then:

1. On `/moves`, use **Prove & mint move NFT** (proves `appendEntry`, then `MoveNft.mint`; first proof can take up to ~4 minutes cold)
2. On `/market`, list / buy / transfer via `MidnightMoveMarketPanel` (buys settle in mUSDC)
3. Settle a merch cart on `/shop` via experimental mUSDC
4. Verify with a GraphQL POST to `http://localhost:8088/api/v4/graphql`

### Environment

Copy `.env.example` to `.env`. `bun run midnight:deploy` upserts contract addresses into `.env` automatically.

```
VITE_NETWORK_ID=undeployed
VITE_INDEXER_URL=http://localhost:8088/api/v4/graphql
VITE_INDEXER_WS_URL=ws://localhost:8088/api/v4/graphql/ws
VITE_PROOF_SERVER_URL=http://localhost:6300
VITE_NODE_URL=http://localhost:9944
VITE_NODE_WS=ws://localhost:9944
VITE_DEFAULT_CONTRACT=<MoveRegistry address from deploy>
VITE_MOVE_NFT_CONTRACT=<MoveNft address from deploy>
VITE_MUSDC_CONTRACT=<MidnightUSDC address from deploy>
VITE_MANDATE_CONTRACT=<MandateVault address from deploy>
VITE_ORDER_CONTRACT=<OrderLedger address from deploy>
```

Optional IPFS pinning (server-only — **never** `VITE_`):

```
PINATA_JWT=<Pinata JWT>
PINATA_GATEWAY=<optional custom gateway host, e.g. mygateway.mypinata.cloud>
```

With `PINATA_JWT` set, `/moves` can upload a move clip through `POST /api/public/pin` (`src/lib/pinata.server.ts`). Without it, pinning reports not configured and the UI falls back to a locally computed CID preview. `GET /api/public/pin` returns `{ enabled, gateway, maxBytes, accepts }`.

### Docker pins

| Service | Image |
| --- | --- |
| Node | `midnightntwrk/midnight-node:0.22.5` |
| Indexer | `midnightntwrk/indexer-standalone:4.0.2` |
| Proof server | `midnightntwrk/proof-server:8.0.3` |

After `bun run midnight:down` then `midnight:up`, run `bun run midnight:deploy` again and restart Vite — chain state and LevelDB private state reset together.

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run midnight:compile` | Compile all `.compact` sources (MoveRegistry, MandateVault, OrderLedger, MidnightUSDC, **MoveNft**) |
| `bun run midnight:artefacts` | Copy keys/zkir/contract into `public/contract/` (including `public/contract/move-nft/`) |
| `bun run midnight:up` / `down` / `status` | Start/stop/inspect local Undeployed stack |
| `bun run midnight:deploy` | Deploy with genesis seed `…0002`; writes `VITE_*` contract env vars |
| `bun run compile` | Full compile → artefacts → up → deploy pipeline |
| `bun run dev` | Vite / TanStack Start app |

## API surface (Undeployed writes)

| Route | Circuit / action |
| --- | --- |
| `POST /api/public/append-entry` | MoveRegistry `appendEntry` |
| `POST /api/public/move-nft-mint` | MoveNft `mint` |
| `POST /api/public/move-nft-list` | MoveNft `list` |
| `POST /api/public/move-nft-cancel` | MoveNft `cancel` |
| `POST /api/public/move-nft-buy` | mUSDC transfer then MoveNft `buy` |
| `POST /api/public/move-nft-transfer` | MoveNft `transfer` |
| `POST /api/public/ap2-anchor` | MandateVault `anchorMandate` |
| `POST /api/public/ucp-record-order` | OrderLedger `recordOrder` |
| `POST /api/public/musdc-faucet` | MidnightUSDC `faucet` |
| `POST /api/public/musdc-transfer` | MidnightUSDC `transfer` |
| `POST /api/public/purchase` | x402 challenge + server settle |
| `GET` / `POST /api/public/pin` | Optional Pinata clip pin (requires `PINATA_JWT`) |

## Prove & mint flow (`/moves`)

1. Build move metadata (and optionally pin a clip via Pinata).
2. **Prove & mint move NFT** calls `append-entry` (MoveRegistry), then `move-nft-mint` with the CID/URI and owner bytes.
3. Gallery / market UIs read the Undeployed MoveNft mirror (`src/data/move-nft-state.undeployed.json`) plus indexer-backed receipts.

## Verify an anchor

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

Indexer tx hashes and midnight-js `txId` strings differ — use the indexer as source of truth.

## Notes

- **mUSDC is experimental** — no peg, never deploy to Mainnet.
- Arc ERC-721 mint / market paths remain in the repo for reference but are paused in favor of Compact MoveNft on Undeployed.
- Cloudflare production builds stub Midnight Node modules; local `vite dev` keeps real server-append (`midnightSsrStub` uses `apply: "build"`).
- Nested `@midnight-ntwrk/onchain-runtime-v3` is removed in `postinstall` to avoid `expected instance of StateValue` / `ChargedState` crashes.

## License

MIT (see `LICENSE` if present) / project source as published on GitHub.
