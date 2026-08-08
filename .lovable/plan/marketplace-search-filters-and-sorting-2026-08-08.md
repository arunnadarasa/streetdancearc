# Marketplace search, filters and sorting

Make the Move Rights market browsable: a search box, category filters, a payment-token filter, and sort controls — all reflected in the URL so a filtered view can be shared or bookmarked.

## What you get

A control bar above the listings grid:

- **Search** — free text matched against move name, token ID, discipline, license and seller address. Debounced, case-insensitive.
- **Category filters** — chips built from the disciplines actually present in the current listings (e.g. Krump, Popping, Breaking), plus a license filter (e.g. Commercial / Personal) when licenses are present. "All" resets.
- **Payment token filter** — All / USDC / EURC / cirBTC, matching the token each listing settles in.
- **Sort** — Newest first (default), Price: low to high, Price: high to low, Payment token (A–Z, price ascending inside each token).
- A result count line ("6 of 14 listings") and a "Clear filters" link when anything is active. When filters hide everything, an empty state explains why instead of the "nothing listed yet" copy.

```text
[ search moves…            ]  [All][Krump][Popping][Breaking]
[Token: All ▾]  [Sort: Newest ▾]        6 of 14 · Clear filters
```

## How "newest" works

Listings currently carry no timestamp — the contract only exposes an unordered active array. The server read will attach a `listedAt` block number to each listing by joining the on-chain `Listed` events already indexed for the activity panel (Arcscan-backed, with the RPC fallback). Where an event can't be found, the listing falls back to token ID order, so newest-first is always sensible.

## Technical notes

- `src/lib/market.server.ts` — add `listedAt: string | null` (block number) and `listedIndex: number` to `MarketListing`; after building items, look up the most recent `Listed` event per token ID via the existing event reader in `market-activity.server.ts` and merge. All lookups stay inside the existing try/catch so a failed join never breaks the grid.
- `src/routes/market.tsx` — add `validateSearch` with `zodValidator` + `fallback` for `q`, `cat`, `license`, `tok`, `sort` (plain strings with fallbacks, clamped in the component). No new loader work; filtering is client-side over the already-fetched listing array.
- `src/components/market/MoveMarketPanel.tsx` — new `MarketFilters` child component for the control bar; the panel derives the visible list with a `useMemo` over `listings` using the search values, and reads/writes them via `Route.useSearch()` / `useNavigate` (function form, preserving other params). Sorting, buying, listing, transfer and the royalty confirmation flow are untouched — filters only narrow what the grid renders.
- Mobile: chips scroll horizontally in a single row with `min-w-0` / `overflow-x-auto`, selects are 44px tall, no new horizontal page overflow.
- Search matching normalises to lowercase and strips the `0x` prefix so pasting a seller address works.

No contract changes, no migrations.
