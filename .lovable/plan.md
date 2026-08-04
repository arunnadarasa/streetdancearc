# Premium Redesign — Midnight Indigo

A full visual overhaul of Dance Move Tokens: from the current Spotify-green-on-black look to a deep navy, electric-indigo system with poster-scale typography and cinematic full-width sections. Every page and both interface modes (H2H and GX) get the new system.

## The look

**Palette — Midnight Indigo**
- Base `#0a0a1a`, elevated surfaces `#141432`, deep panels `#1e1e5a`, action accent `#4f46e5`
- Secondary glow accent derived from the indigo for hover states, focus rings and value highlights
- Chain/status colours (success, warning, destructive) restyled to sit inside the indigo world rather than fight it

**Typography — Archivo Black + Hind**
- Archivo Black for headlines: huge, tight, poster-scale. Hero headline goes oversized and edge-aware.
- Hind for body, labels, numbers and JSON/data readouts
- A clear type scale so section headers, eyebrows, prices and stats all feel deliberate

**Layout — full-width sections**
- Each page becomes a sequence of full-bleed bands with generous vertical rhythm, alternating surface depth so the page breathes as you scroll
- Content stays in a max-width rail inside each band; the bands themselves run edge to edge

## WOW-factor treatments

- **Hero**: layered indigo aurora gradient + subtle grain, oversized headline with a staggered fade-in, live chain/treasury status strip underneath
- **Depth system**: soft indigo glow shadows, thin luminous borders, glassy elevated cards instead of flat boxes
- **Motion**: scroll-reveal on section entry, magnetic-feel hover lifts on cards and buttons, animated number counts on stats. All respect `prefers-reduced-motion`.
- **Product cards**: image-forward with a gradient scrim, price and token badge overlaid, hover zoom + lift
- **GX mode**: agent surfaces get a terminal-grade treatment — mono data blocks, glowing run-ledger timeline with active-step pulse, indigo-tinted JSON panels. Toggling H2H/GX visibly changes register (warm retail vs. cold machine console).
- **Header**: slim sticky bar that condenses on scroll, refined H2H/GX pill, cart with a badge
- **Deck**: slides inherit the same tokens so the in-app deck matches the site

## Pages covered

Home, Shop, Product detail, Markets, Deck, plus the GX home / shop / offer surfaces, mint form, token switcher, treasury card and cart drawer.

Mobile stays first-class: type scales down cleanly, bands keep their rhythm, tap targets and the header remain comfortable.

## Technical notes

- Replace the default shadcn token values in `src/styles.css` with the Midnight Indigo palette in oklch, on both `:root` and `.dark`. Add new tokens for gradients, glow shadows, surface elevations and the accent ramp.
- Load Archivo Black + Hind via `<link>` tags in `src/routes/__root.tsx` head and register `--font-display` / `--font-sans` in `@theme`.
- Strip the ~75 hardcoded hex colours (`#1DB954`, `#0a0a0a`, `#1ed760`, etc.) across components and replace them with semantic token classes, so nothing bypasses the theme.
- Add reusable primitives: a `Section` band wrapper, a `Reveal` scroll-animation wrapper, and glow/gradient utilities defined with `@utility` in `src/styles.css`.
- Add `@keyframes` for aurora drift, shimmer and stagger-in; gate all motion behind a reduced-motion variant.
- No changes to contracts, Circle/Privy wiring, Shopify data fetching, the x402 endpoints or the spend-policy logic — this is presentation only.
