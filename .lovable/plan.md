# Plan — Judges' Deck for Dance Move Tokens

Generate a polished 10-slide PPTX pitch deck targeted at the Encode × Arc judges, saved to `/mnt/documents/DanceMoveTokens-JudgesDeck.pptx` (plus a PDF export for easy sharing).

## Approach

Build with `pptxgenjs` (Node) per the `pptx` skill — creates from scratch, no template. Render at 16:9 (13.333" × 7.5"). Then convert to PDF via LibreOffice and rasterize slides to JPGs for mandatory visual QA; iterate until clean.

## Design direction

- **Palette — "Cherry Bold + Street Neon":** deep charcoal `#0A0A0A` background, off-white `#FCF6F5` text, Spotify-green accent `#1DB954` (matches the app), cherry-red `#E94560` for stat callouts. Matches the streetwear/street-dance vibe, not another generic blue deck.
- **Type pairing:** Impact / Arial Black headers, Arial body. Big titles (44-54pt), body 22-28pt, stat callouts 96pt+.
- **Motif:** thin cherry-red rule top-left of each content slide + tiny page counter bottom-right. No cheesy AI accent underlines.
- **Every slide has a visual element** (stat, icon shape, code block, arcscan screenshot, or 2-col layout). No text-only slides.

## Slide outline (10 slides)

1. **Title** — "Dance Move Tokens" · "Onchain rights + streetwear on Circle's Arc" · team, hackathon, date. Dark hero.
2. **The problem** — Choreographers get zero royalties when their moves go viral. Stat callout: "$0 paid to the choreographer of the most-copied TikTok dance of 2025."
3. **The insight** — Street dance already has culture-level attribution (crews, battles, credit). We give it a settlement layer. Two-col: culture quote / onchain proof.
4. **What we built** — Two products, one repo:  (a) Rights registry + AI agent, (b) Streetwear marketplace. Icon cards.
5. **Live on Arc** — Contract `0x4d13…65f0` verified on Arcscan (chain 5042002), USDC gas, EURC + cirBTC supported. Screenshot/mock of Arcscan verified badge.
6. **Agentic Economy track** — Rights Agent flow diagram: user → agent (Agent Stack) → quote → pay in stablecoin → `log()` → Arcscan receipt. Autonomous, no human click in the loop.
7. **DeFi track** — Multi-stablecoin merch checkout via App Kits Unified Balance + Send; nanopayments stream per-play royalties. Small architecture strip.
8. **Judging criteria mapping** — Compact table from PRD §18: each "what we're looking for" bullet → the feature that answers it.
9. **Traction & roadmap** — Deployed, verified, 7 SKUs live in Shopify, mobile-ready. Next: ERC-721 receipts, crew treasuries, on-chain cosigns.
10. **Team + ask + links** — Names/roles, Arcscan link, live URL `streetdancearc.lovable.app`, repo, contact. Closing CTA.

## Files

- `/mnt/documents/DanceMoveTokens-JudgesDeck.pptx`
- `/mnt/documents/DanceMoveTokens-JudgesDeck.pdf` (LibreOffice export)

## QA loop (mandatory)

1. Generate PPTX → convert to PDF → `pdftoppm` to JPGs
2. View every slide image, list defects (overflow, low contrast, crowding, orphan lines)
3. Fix, re-render, re-inspect until a clean pass
4. Report what I checked and fixed in the final message

## Out of scope

- No source-code changes to the app.
- No custom photography — use shapes, type, and simple SVG-style icons drawn with pptxgenjs primitives; no external image downloads unless the QA pass shows a slide needs one, in which case I'll `imagegen` a minimal streetwear texture.
- Not editing the PRD.
