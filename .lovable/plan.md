# Marketplace activity panel

Add an on-chain activity feed to the Move Rights market page showing your **list**, **buy**, **cancel** and **transfer** events, each with an Arcscan link and a plain-English summary.

## What you'll see

A new "Your market activity" card under the marketplace on `/market`:

- One row per on-chain event, newest first, with a coloured badge: Listed / Sold / Cancelled / Transferred.
- A readable one-liner per row, for example:
  - `Listed move #7 for 12.5 USDC`
  - `Bought move #7 from 0x67a1…a420 for 12.5 USDC`
  - `Cancelled listing for move #7`
  - `Transferred move #7 to 0x8f2c…91de`
- Supporting details on each row: token ID, price with payment-token symbol (USDC / EURC / cirBTC), the move's metadata CID (truncated, tap to copy, links to the IPFS gateway), counterparty address, block age, and success/failed status.
- A **View on Arcscan** link per row plus the transaction hash.
- Toggle between **Mine** (default, filtered to your connected wallet) and **All** market activity, plus a kind filter (All / Listed / Sold / Cancelled / Transfers) and a refresh button.
- Sensible empty states: not connected, no activity yet, and a degraded state when the RPC can't serve history.

## Technical notes

**`src/lib/market-activity.server.ts` (new)**
- Reads `Listed`, `Cancelled`, `Sold` from `MoveMarket` (`src/data/move-market.json`) and ERC-721 `Transfer` from the Move Rights NFT (`src/data/move-nft.json`) via `ARC_LOGS_RPC_URL`.
- Reuses the proven windowing from `src/lib/receipts.server.ts`: 2,000-block windows shrinking on range errors, backoff on 429, ~5,000-block lookback, call/time budget, 45s in-memory cache. Never throws — returns `{ events, degraded, detail }`.
- Marks mint transfers (`from == 0x0`) separately from wallet-to-wallet transfers, and drops the `Transfer` that is the settlement leg of a `Sold` in the same tx so a purchase isn't double-listed.
- Resolves each token's CID once via `tokenURI` (memoised per tokenId) and normalises `ipfs://` to a gateway URL, matching `market.server.ts`.
- Maps `payToken` to a `TokenKey` and formats price with that token's decimals (cirBTC is 8).
- Resolves receipt status for the newest N events only, capped, as receipts.server.ts does.

**`src/lib/market.functions.ts`** — add `listMarketActivity` server fn taking an optional `owner` address and limit.

**`src/components/market/MarketActivityPanel.tsx` (new)** — client component using `useServerFn` and `useWallet()` for the connected address; same visual language as `ReceiptHistoryPanel.tsx` (badge, status pill, `ago()`, truncated hashes). Mobile-safe: `min-w-0` / `break-all` on hashes and CIDs so long strings can't widen the viewport.

**`src/routes/market.tsx`** — render the panel below `<MoveMarketPanel />`.

No contract changes, no migrations, no new dependencies.
