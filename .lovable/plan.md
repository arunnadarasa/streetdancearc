# Add the missing "Renew mandate" action

## What's wrong

The "Your payout authorization expires in 3 days" card in the A2H inbox has no
action — only "Show protocol". The inbox card component renders action buttons
for approval cards (Approve / Decline) and offer cards (Claim / Dismiss), but has
no branch for mandate cards, so the renewal the copy tells you to do is
impossible.

## What to build

In the inbox card, add a mandate branch with two buttons, styled like the
existing pairs:

- **Renew mandate** (primary) — extends the standing authorization by 90 days.
- **Not now** (secondary) — records "deferred" on the thread, matching the
  Decline/Dismiss pattern.

On renew:

1. Push the standing AP2 payout mandate's `expires_at` 90 days forward and
   re-sign it, reusing the same Ed25519 mandate-signing path the payout flow
   already uses, so the renewal produces a real signed artifact rather than a
   UI-only state change.
2. Show the new expiry inline ("Renewed — valid through <date>") and swap the
   card's amber "mandate expiring" tone to the calm default.
3. Expose the freshly signed mandate under the card's existing "Show protocol"
   panel so judges can see the AP2 object that changed.

Because caps and expiry live in the demo's session-scoped state (no database),
the renewed mandate persists for the session, consistent with how the rest of
the A2H demo tracks payouts.

## Technical notes

- `src/components/a2h/InboxCard.tsx` — new `msg.kind === "mandate"` action
  branch, renewed-state rendering.
- `src/components/a2h/a2h-feed.ts` — derive `expires_at` from a mutable session
  value instead of the hardcoded literal.
- New server function alongside the existing A2H engine to re-sign the mandate;
  no contract, chain, or Circle calls involved — renewal is an off-chain
  authorization, not a payment.
