# Calmer H2A run: collapse the JSON, surface the receipts

The H2A demo currently prints a full JSON payload under every step, so the run reads as a wall of code and the one thing a judge cares about — the Arc transaction — is buried. This keeps every byte of the audit trail but hides it behind a toggle, and pulls settlement links to the front.

## What changes

**1. Payloads collapse by default**
Each step's JSON becomes a collapsed "Show payload" disclosure with a one-line hint (e.g. `payload · 12 keys`). Clicking expands it in place. Failed/blocked steps auto-expand, since that's when the raw data matters.

**2. A run summary bar above the ledger**
While a task runs and after it finishes: step progress (`5/7`), an overall state chip (running / settled / blocked / failed), and — once a transfer lands — a prominent "View receipt on Arcscan" button showing the amount and token. One glance answers "did it pay, and where's the proof".

**3. Steps read as prose, not logs**
Titles stay accurate but drop the monospace treatment for the headline (kept for hashes and endpoints). Each step shows its plain-English detail line first; the technical endpoint moves to a small muted subtitle.

**4. Clear transaction links everywhere**
- Settlement step gets a proper button (not a small text link) with the short hash and an external-link icon.
- Any tx hash inside an expanded payload stays clickable (already supported).
- Copy-hash affordance next to the receipt button.

**5. One master switch**
A "Raw JSON" toggle in the ledger header expands/collapses every payload at once, so the deep-dive view is one click away for a technical judge.

## Scope

Presentation only — no changes to the agent run logic, policy checks, or settlement path. The same steps, payloads and links are emitted; only their rendering changes.

## Technical notes

- `src/components/gx/JsonBlock.tsx`: add optional `collapsible` and `defaultOpen` props using a native `<details>`/state disclosure; existing call sites keep current behaviour by default.
- `src/components/gx/RunLedger.tsx`: restructure the step row (icon rail, title, muted subtitle, detail, action row); render payloads collapsed unless status is `failed`/`blocked` or the master toggle is on; add a `RunSummary` header block computing progress and finding the settlement step via `step.href`.
- `src/components/gx/AgentRunPanel.tsx`: move the "Run ledger" label into the new summary header.
- No changes to `useAgentRun.ts`, so H2A, A2A and the judge run all inherit the calmer ledger.
