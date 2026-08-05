# Make transaction/explorer links clickable

## What's wrong

On-chain receipts and protocol payloads are rendered as plain preformatted JSON, so the Arcscan explorer URL (e.g. `https://testnet.arcscan.app/tx/0x…`) is just text — you can't tap it on mobile.

## Fix

### 1. Linkify URLs inside the JSON viewer
Update `src/components/gx/JsonBlock.tsx` so the rendered text is split on `https?://…` matches and each URL becomes an `<a>`:

- Underlined, primary/glow-tinted, `target="_blank"` with `rel="noopener noreferrer"`.
- Keeps existing `whitespace-pre-wrap break-all` wrapping so long hashes still wrap on mobile.
- Strips trailing punctuation/quote characters from the matched URL so the JSON quoting stays intact.
- Applies everywhere JsonBlock is used (A2A negotiation, H2A agent run, protocol transcript), not just the receipt.

### 2. Add an explicit explorer button on the receipt
In `src/components/gx/AgentNegotiation.tsx`, when the receipt contains a settlement explorer URL, render a tappable "View transaction on Arcscan →" pill above the JSON block, so the primary action doesn't depend on hunting inside the payload. Only shown when the URL exists.

If the H2A flow renders a receipt the same way, apply the same button there for consistency.

## Verification

Run an A2A settlement in the preview at 384px, confirm the explorer URL inside the receipt is tappable and opens Arcscan in a new tab, and that JSON still wraps without horizontal overflow.
