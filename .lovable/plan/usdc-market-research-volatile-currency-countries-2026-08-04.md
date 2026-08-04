# USDC Market Research: Volatile-Currency Countries

Research is running now across Sub-Saharan Africa, Latin America, and selected Asian/MENA markets. Once it lands, the findings ship in four places.

## 1. Research brief (document)

`USDC-Market-Opportunity.md` in your documents, alongside the PRD and GX leads brief.

Structure:
- Executive summary — the impact story first (why dollar access changes outcomes for young creators in these markets), sizing tables underneath.
- Ranked shortlist of 12–18 countries: currency, inflation, 3-yr depreciation vs USD, parallel-market premium, capital controls, young urban population, smartphone penetration, remittance inflows, existing stablecoin adoption evidence.
- Regulatory reality per market: is USDC legal to hold and receive, VASP licensing, on/off-ramp availability (exchanges, mobile money like M-Pesa, local P2P).
- Circle-specific signals: Circle Mint availability, Circle Payments Network corridors, Arc positioning, announced Africa/LatAm partnerships.
- Cultural fit: street dance and streetwear scenes per market (Nigeria legwork, Ghana azonto, South Africa amapiano, Angola kuduro, Brazil passinho, Philippines).
- Top 5 launch markets with rationale, main risk, and what USDC-first checkout unlocks that cards cannot — no chargebacks, sub-cent fees, no FX spread, instant creator payout, works without a bank card.
- Full source list, with explicit gaps where reliable data was not found.

Every figure carries a source. Anything unverifiable gets marked as an estimate rather than stated as fact.

## 2. New PRD section

Add `§19 Target Markets & Economic Rationale` to `PRD-DanceMoveTokens.md`:
- Condensed top-5 launch market table.
- Two-paragraph "why USDC-first, not card-first" argument tied to the hackathon's Programmable Money framing.
- Cross-reference to the full brief.
- Add matching tasks to the existing §17 sprint timeline (market-specific copy, currency display, corridor research follow-ups).

## 3. Judges' deck slide

Add one slide to the interactive deck at `/deck` (`src/components/deck/slides.tsx`, registered in `Deck.tsx`):
- Title: the market opportunity.
- A world-map-free, type-led layout: 3 headline stats (young urban population reachable, combined remittance inflows, stablecoin users today) plus the top 5 markets as pills.
- Matches the existing Spotify-dark deck styling and slide numbering; navigation, dots, and swipe pick it up automatically.

The downloadable PPTX/PDF currently on `/deck` is a static export from earlier — it will be one slide behind the interactive deck unless you want it regenerated too. Say the word and I will re-export both.

## 4. In-app `/markets` page

New route `src/routes/markets.tsx`, linked from the header next to Deck:
- Hero: the thesis in one sentence.
- Launch-market cards: flag, currency, inflation figure, one-line "what USDC fixes here", cited source link.
- A "Why stablecoins here" section contrasting card checkout vs USDC checkout on fees, settlement time, chargebacks, and card access.
- Own `head()` metadata (title, description, og tags) so it is shareable and indexable.
- Mobile-first, reusing the existing dark token palette and card patterns from `/shop`.

## Technical notes

- Market data lives in one typed module (`src/data/markets.ts`) so the page, the slide, and future copy all read the same numbers — no duplicated figures drifting apart.
- No backend, no new dependencies. Static data, server-rendered.
- Header gets one more link; on mobile the existing stacked layout absorbs it, but I will check the pill row does not overflow at 360px.
