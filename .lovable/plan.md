# Make the A2H payout inbox stop showing RPC errors

## What the screenshot shows

The registry reader started with a 20,000-block window, hit a range error, shrank to the 10-block floor, and then the public Arc RPC rate-limited it (`Details: rate limit exceeded`). At 10 blocks per call it can never cover the 100,000-block lookback inside the 9s budget, so the inbox always ends up degraded and prints the raw viem error text.

Confirmed in `src/lib/a2h.server.ts:159-217` (window shrink to `10n`, 9s deadline, `lastError` surfaced verbatim) and the banner in `src/components/a2h/A2hHome.tsx`.

## Plan

1. **Stop the doomed scan.** In `readPayouts`, if the window shrinks below a usable size (e.g. under 500 blocks), abandon the wide history read immediately instead of grinding through rate limits until the deadline.
2. **Cap the lookback to what a rate-limited RPC can actually serve.** Reduce the default lookback to a recent window (~5,000 blocks), keep windowed paging, add jittered backoff on 429s, and cap the number of RPC calls per read.
3. **Cache successful reads.** Keep the last good log set in module memory (with a short TTL) so subsequent inbox loads render instantly and don't re-trigger rate limits.
4. **Treat partial history as normal, not an error.** Only mark `degraded` when zero history could be read AND there are no session payouts. Otherwise show the payouts with a quiet "showing recent history" note.
5. **Never surface raw JSON-RPC text.** Map provider errors to short human reasons ("the public Arc RPC is rate-limiting history reads right now"); keep the full text out of the UI entirely rather than behind a details toggle.
6. **Verify.** Load the A2H page, confirm the inbox renders without the amber error block, then run a rights sweep and confirm the new settlement appears with a working Arcscan link.

## Technical notes

- Files: `src/lib/a2h.server.ts` (scan strategy, cache, error mapping), `src/components/a2h/A2hHome.tsx` (banner copy), `src/lib/a2h-engine.server.ts` only if the `degraded`/`detail` shape changes.
- No contract, Circle, FX, or payout-sending changes.
- Optional follow-up (not in this plan): set `ARC_LOGS_RPC_URL` to a paid archive endpoint for full history.
