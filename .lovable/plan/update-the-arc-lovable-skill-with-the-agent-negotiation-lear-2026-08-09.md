# Update the Arc Lovable skill with the agent-negotiation learnings

The skill currently covers chain constants, Circle SCP, RPC/indexing, contracts/verification and payments UX. It has nothing about the LLM negotiation layer that sits in front of settlement — which is where today's "the agents never close a deal" bug came from.

## What gets added

**1. New reference: `references/agent-negotiation.md`**
Captures the rules that make a two-agent buyer/seller demo close reliably:
- Never hardcode a budget in the demo goal text. Derive it from the live catalog at run time (cheapest in-policy item plus headroom, capped by the spend policy). A hardcoded "under 0.03" against a 0.047 catalog is a guaranteed no-deal.
- Give the seller a discount ladder with an explicit floor (list price and floor price both rendered into the prompt) and forbid flat refusals — counter with a discount or substitute a cheaper in-category item.
- Tell both agents which turn is final and what to do on it.
- Never rely on prompts alone for a success rate. Add a deterministic post-loop safety net: promote the best in-policy quote the seller ever put on the table to the final quote and append a synthetic closing turn.
- Clamp LLM-returned prices in code: minor-units-vs-decimal confusion (15000 vs 0.015), and clamp between floor and list.
- Keep the policy guard-rail honest — a genuinely out-of-policy run must still fail, with a one-line reason shown in the UI rather than the chat trailing off.

**2. `SKILL.md` — two new always-apply rules**
- Agent-demo outcomes come from deterministic code, not prompt wording; prompts shape the transcript, code guarantees the close.
- Any price an LLM emits is untrusted input: normalise, clamp, and re-derive from the catalog before it reaches a settlement path.
Plus a row in the reference index pointing at the new file, and a "what I'd do differently" entry about building the fallback before tuning prompts.

**3. `references/failure-modes.md` — four new rows**
- Negotiation always ends in a refusal → hardcoded budget below every catalog price → derive budget from catalog.
- Seller refuses instead of countering → prompt only allows list price → give it a floor and forbid refusals.
- Quote totals off by 1e6 → LLM returned minor units → clamp/convert in the normaliser.
- Run ends with no quote and no explanation → outcome not modelled → return `outcome` + `reason` and render it.

## Technical notes

- Files edited: `.agents/skills/lovable-arc/SKILL.md`, `.agents/skills/lovable-arc/references/failure-modes.md`; new `.agents/skills/lovable-arc/references/agent-negotiation.md`.
- Applied with the skill-apply tool so the active workspace copy picks up the change (`.workspace/skills/` is never edited directly).
- Documentation only — no app code changes.
