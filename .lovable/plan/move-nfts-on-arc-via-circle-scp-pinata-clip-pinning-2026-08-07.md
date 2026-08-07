# Move NFTs on Arc via Circle SCP (+ Pinata clip pinning)

Yes — both docs confirm it works on Arc Testnet today:

- Circle's Smart Contract Platform ships a pre-audited **ERC-721 template** (`76b83278-50e2-4006-8b63-5b1a2a814533`) deployable to `ARC-TESTNET` from our existing dev-controlled treasury wallet — no Solidity, USDC gas, same deploy path we already use.
- Minting is one Circle call: `mintTo(address,string)` with an `ipfs://<cid>` token URI.
- Circle exposes `GET /v1/w3s/wallets/{id}/nfts`, so a wallet's moves can be listed back without indexing Arc ourselves.

So a registered move stops being just an event log and becomes a transferable, royalty-bearing rights token.

## What changes

**1. Deploy a MoveRights ERC-721 (one-off script)**
`scripts/deploy-nft-arc.mjs` deploys the SCP ERC-721 template to Arc Testnet with `name: StreetRail Move Rights`, `symbol: MOVE`, admin/sale/royalty recipient = the treasury address, `royaltyPercent: 0.05`. Address + ABI land in `src/data/move-nft.json`, verified link on Arcscan.

**2. Clip upload → Pinata → token URI**
In the move registry Step 1, an optional "Upload move clip" field (MP4/MOV/WebM, ≤25 MB). The clip is pinned to IPFS via Pinata; the metadata JSON gains a `media` block plus standard NFT fields (`name`, `description`, `image`/`animation_url`) and is itself pinned, so the CID actually resolves. Text-only moves still work unchanged if no clip is attached.

**3. Mint the move**
"Approve & Log Move" becomes two receipts:
- `log(token, amount, cid)` on `DanceMoveTokens` — the payment/rights record we already have.
- `mintTo(dancerAddress, ipfs://cid)` on the new ERC-721 — the ownable move token, minted agent-side from the treasury so the dancer pays no gas and sees no extra wallet prompt.
Both hashes render as Arcscan links, and receipt history gains a "Move NFTs" filter.

**4. "My moves" gallery**
A panel on `/moves` listing the connected wallet's move NFTs via Circle's wallet-NFTs endpoint, each with clip thumbnail, discipline, license, and an Arcscan link.

## What I need from you

A **Pinata JWT** (Pinata → API Keys → key with `pinFileToIPFS` + `pinJSONToIPFS`), stored as `PINATA_JWT`, optionally `PINATA_GATEWAY` for branded gateway links. Without it the upload field stays hidden and minting falls back to the locally computed CID.

The treasury needs a little more USDC gas than usual — deploy plus each mint is a real tx.

## Technical notes

- `src/lib/nft.server.ts`: `deployMoveNft` (SCP `POST /templates/{id}/deploy`) and `mintMove` (`POST /v1/w3s/developer/transactions/contractExecution`). Both reuse `src/lib/circle.server.ts` for the per-request entity-secret ciphertext and keep the top-level `feeLevel: "MEDIUM"` shape that fixed the earlier "gasPrice may not be empty" error.
- `src/lib/pinata.server.ts`: `pinFile` / `pinJson` via `fetch` + `FormData` against `api.pinata.cloud` — Worker-safe, no Node SDK.
- Uploads go through a server route `src/routes/api/public/pin` using `request.formData()` (server functions can't take a stream), with size cap and MIME allowlist enforced in the handler.
- `src/lib/move-metadata.ts` extends `MoveMetadata` with `media` and ERC-721 display fields; the Pinata-returned CID wins over the local `computeCid` preview if they ever differ.
- `src/lib/nft.functions.ts` exposes `mintMoveNft` and `listWalletMoveNfts`; `MintForm.tsx` and a new `MoveNftGallery.tsx` consume them.
- No change to `DanceMoveTokens.sol` or the ERC-1271 authorizer.

## Scope note

This is a bigger piece than the last few changes — deploy script, Pinata layer, mint path, and gallery. If you want it staged, the natural split is: (1) Pinata + metadata, (2) ERC-721 deploy + mint, (3) gallery.
