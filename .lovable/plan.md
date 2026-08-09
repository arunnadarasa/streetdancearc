# Calmer A2H page: fold the protocol JSON, lead with the receipt

The A2H page shows the same wall-of-JSON problem the H2A run had: the standing mandate is printed in full above the inbox, and each inbox card's "Show protocol" toggle dumps up to four expanded JSON blocks at once. Apply the same receipt-first treatment already used in the H2A run ledger.

## What changes

**1. Standing mandate collapses by default**
The AP2 payout mandate JSON under "What agents may push to you without asking" becomes a collapsed disclosure (`AP2 payout mandate · N fields`). The plain-English caps grid stays visible — that's the part a judge reads.

**2. Inbox card protocol section becomes individually collapsible**
"Show protocol" still reveals the section, but each envelope/mandate/claim block inside is its own collapsed disclosure instead of four expanded dumps. Blocks tied to a failed action expand automatically.

**3. Receipt-first inbox cards**
The Arcscan receipt link becomes the primary button (same style as the run ledger's), with the short tx hash and a copy-hash affordance next to it, so the proof reads as the main action rather than one chip among many.

**4. One "Raw JSON" master toggle for the page**
A single toggle in the payout inbox header expands or collapses every protocol payload on the page at once, for a technical reviewer who wants everything.

**5. Error details stay one line**
The existing "Show details" raw text block keeps its behaviour but gets the same muted disclosure styling so it reads consistently with the rest.

## Scope

Presentation only — no changes to payout, claim, mandate, or registry-read logic. Same data, same links, calmer rendering.

## Technical notes

- Reuse `JsonBlock`'s existing `collapsible` / `defaultOpen` props (added for the run ledger) — no new component needed for the payloads.
- Extract the run ledger's `ReceiptButton` (currently local to `src/components/gx/RunLedger.tsx`) into a shared `src/components/gx/ReceiptButton.tsx` and use it in both places.
- `src/components/a2h/A2hHome.tsx`: mandate `JsonBlock` gets `collapsible defaultOpen={false}`; add a `rawAll` state in the inbox header and pass it down to the cards.
- `src/components/a2h/InboxCard.tsx`: accept an optional `rawAll` prop; render each protocol `JsonBlock` collapsible, defaulting open only when `rawAll` is on or the related action errored; swap the receipt chip for `ReceiptButton`.
