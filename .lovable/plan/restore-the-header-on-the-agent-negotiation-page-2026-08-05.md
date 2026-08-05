# Restore the header on the Agent Negotiation page

## What's wrong

The Agent Negotiation page renders only the negotiation panel. Unlike every other page (Shop, Moves, Markets, Deck), it never renders the site header or footer, so the logo, H2H/H2A/A2A toggle, wallet chip and nav links disappear once you land there.

## Fix

In `src/routes/agent-negotiation.tsx`, wrap the page content in the same shell the other routes use:

- Add `Header` from `@/components/dance/Header` above the negotiation component.
- Add `SiteFooter` from `@/components/layout/SiteFooter` below it.
- Wrap in the standard `min-h-screen bg-background text-foreground` container so background and spacing match the rest of the site.
- Keep the existing `PrivyRoot` wrapper and loader untouched, so the wallet chip in the header works here too.

No changes to the negotiation logic, protocol transcript, or styling of the panel itself.

## Verification

Load `/agent-negotiation` at mobile (390px) and desktop widths and confirm the header, mode toggle, nav links and footer render with no horizontal overflow.
