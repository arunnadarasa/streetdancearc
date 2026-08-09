# Update the Arc skill with the latest demo-UX learnings

Since the last skill update, four things were learned building StreetRail that aren't captured yet: the sticky-header/scroll-lock bug, the collapsible run-ledger pattern, the cross-mode settlement ledger for judges, and catalog-derived prefilled inputs. Add them to the skill.

## New reference: `references/demo-ux.md`

Covers the judge-facing presentation layer on Arc demos:

- **Collapse the JSON, surface the receipt.** Agent run ledgers become a wall of code. Pattern: a summary bar (state chip, `n/total` steps, primary "View receipt on Arcscan" button with copy-hash), payloads collapsed behind a `payload · N fields` disclosure, auto-expanded only on failed/blocked steps, plus one master "Raw JSON" toggle for technical reviewers.
- **One settlement ledger across every payment mode.** A shared browser-persisted log (capped, newest-first) that H2H cart, H2A agent runs, A2A negotiation, and A2H payouts/claims all write to, rendered with relative time, mode chip, amount + token, Arcscan link, and confirmed/pending status pulled from the Arcscan v2 API. Judges need one place that proves things settled.
- **Prefill demo inputs from live data, never hardcode amounts.** Derive the suggested budget/goal string from the catalog, keep updating it until the user edits the field (dirty flag), and show a "Reset to recommended" affordance. Hardcoded budgets in demo prompt text go stale the moment prices change and cause fake failures.

## Update `references/failure-modes.md`

Add rows:

| Symptom | Cause | Fix |
| --- | --- | --- |
| Sticky header vanishes when a dropdown opens mid-scroll | Radix menus default to `modal`, which sets `overflow:hidden` + `position:relative` on `<body>` and breaks the sticky containing block | `modal={false}` on non-overlay menus (nav "More", currency toggle) |
| Prefilled agent goal fails against live prices | Budget hardcoded in the goal string | Derive from catalog; dirty-flag the input |
| Run ledger reads as a wall of code | Every payload rendered expanded | Collapsible payloads + summary bar |

## Update `SKILL.md`

- Two new hard rules: Radix `modal={false}` next to any sticky chrome; every settlement path writes to one shared client ledger from the start.
- Reference index row for `demo-ux.md`.
- "What worked well": summary-bar-plus-collapsed-payload ledger; single cross-mode settlement list.
- "What I'd do differently": build the settlement ledger on day one rather than after judges ask where the transactions are.

## Technical notes

Files edited: `.agents/skills/lovable-arc/SKILL.md`, `.agents/skills/lovable-arc/references/failure-modes.md`, new `.agents/skills/lovable-arc/references/demo-ux.md`. Then `skills--apply_draft` on `.agents/skills/lovable-arc` to activate. No app code changes.
