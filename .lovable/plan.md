# Fix: header disappears when opening the "More" menu

## What's happening

Confirmed by reproducing it on `/judge`: scroll down 1181px, click **More**, and the header jumps from `top: 0` to `top: -1181px` — it scrolls off with the page instead of staying pinned.

Cause: the More menu is a Radix dropdown in its default *modal* mode. On open it locks page scrolling by setting `overflow: hidden` and `position: relative` on `<body>`. That makes the body a new scroll/positioning context, so the sticky header loses its pin and snaps back to its natural position far above the viewport. Closing the menu restores it.

## The fix

Turn off modal mode for the header's More dropdown so it stops locking the body. The menu still opens, closes on outside click and Escape, and keeps keyboard navigation — it just no longer freezes the page.

Same check applied to the other header popovers (wallet menu, quick contract links) so none of them re-introduces the jump. The mobile drawer and the Contracts sheet keep their scroll lock — a full-screen overlay is supposed to stop the page behind it.

## Technical detail

- `src/components/dance/Header.tsx`: pass `modal={false}` to the `DropdownMenu` wrapping the More trigger, and to any other non-overlay dropdown/popover in the header.
- Verify with the same Playwright reproduction: after clicking More at scroll offset > 0, the header rect must stay at `top: 0` and `body` must keep its normal overflow.
