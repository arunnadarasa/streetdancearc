# Fix "Couldn't read the registry" in the A2H payout inbox

## What's happening

The payout inbox reads the rights registry's `Logged` events with a single `eth_getLogs` over the last 200,000 blocks. That request goes to the Alchemy Arc endpoint (`ARC_RPC_URL`), whose free tier caps `eth_getLogs` at a **10-block range**. Alchemy rejects the call, so the inbox shows the raw provider error instead of history. Confirmed in `src/lib/a2h.server.ts:66-70` — one unbounded range, one RPC, no fallback.

The write path (payouts through the Circle treasury) is unaffected; only the read-back is broken.

## Plan

1. Split the RPC roles in `src/lib/a2h.server.ts`:
   - Keep Alchemy (`ARC_RPC_URL`) for general calls.
   - Add a dedicated **log-reading endpoint** that defaults to the public Arc Testnet RPC (`https://rpc.testnet.arc.network`), which has no 10-block cap, overridable via a new optional `ARC_LOGS_RPC_URL`.
2. Make `readPayouts` resilient instead of all-or-nothing:
   - Try the wide-range read on the log endpoint first.
   - If the provider rejects the range (error text mentions block range / limit), fall back to a **chunked scan** of a much smaller recent window (default ~1,000 blocks in provider-safe chunks, run with small concurrency and an overall time budget) rather than failing.
   - If every attempt fails, return an empty list plus a `degraded` flag with a short reason instead of surfacing a raw JSON-RPC dump.
3. Update the inbox UI (`src/components/a2h/A2hHome.tsx`) so the degraded state reads as a one-line, human note ("Registry history is temporarily unavailable — payouts still settle on Arc") with the technical detail behind a collapsed "details" toggle, not a wall of JSON.
4. Keep a lightweight in-process record of payouts made during the session so a fresh settlement always appears in the inbox even when history reads are degraded.
5. Verify: load the A2H page, confirm the inbox renders history (or the calm degraded note), then run a rights sweep and confirm the new payout appears with a working Arcscan link.

## Technical notes

- Files: `src/lib/a2h.server.ts` (log client + chunked/fallback reader), `src/lib/a2h.functions.ts` (pass the `degraded` flag through), `src/components/a2h/A2hHome.tsx` (error presentation).
- No contract, Circle, or FX changes. Payout sending path untouched.
- Optional secret `ARC_LOGS_RPC_URL` only if you later want a paid archive endpoint for full history; the public Arc RPC is the default and needs no key.
