## Goal

Fold this session's new learnings into the `lovable-arc` skill so the next agent instance ships an Arc demo without re-hitting the same walls. Draft under `.agents/skills/lovable-arc/SKILL.md`, then apply.

## What to add / change

### 1. RPC hostname correction
Current skill says `https://rpc.testnet.arc.io`. The working project uses `https://rpc.testnet.arc.network`. Update the chain-constants table, the viem snippet, and add a note that both hostnames appear in Circle/Arc docs — `.network` is what actually resolves for RPC in this template.

### 2. Official token addresses (Arc Testnet)
Add a concrete table so future agents don't have to hunt through Circle docs:

| Token | Address | Decimals |
|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 |
| cirBTC | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | 8 |

Link the two Circle reference pages (cirBTC + EURC contract addresses).

### 3. Privy approval-modal UX gotcha (new section)
Document the confusion the user hit:
- Privy's approval modal always shows the wallet's **gas-token balance** (USDC on Arc), regardless of which ERC-20 is being approved.
- "Approval amount" renders blank for non-USDC ERC-20s because Privy has no token metadata for EURC/cirBTC.
- Not a bug — Privy UI limitation. Fix in your app by rendering a pre-confirmation summary above the button showing the actual token symbol, amount, and short address.
- If a token address is the zero address (env var unset), gate it in the token switcher instead of silently skipping the approve step.

### 4. Verification success recipe (upgrade existing section)
The current section describes the failure. Add the confirmed working recipe from this session:
- Pin `solc@0.8.24` in `package.json` devDependencies (not just in a script).
- Contract pragma: exact `pragma solidity 0.8.24;` (no caret).
- Endpoint that worked: `POST https://testnet.arcscan.app/api?module=contract&action=verifysourcecode` with `codeformat=solidity-standard-json-input` and `compilerversion=v` + `solc.version().split(".Emscripten")[0]`.
- Confirmation signal: `is_verified: true` on `GET /api/v2/smart-contracts/{address}`.

### 5. Bootstrap script hardening (add to entity-secret section)
Codify the persist-before-network rule as code, not just prose:
```js
const raw = crypto.randomBytes(32).toString("hex");
fs.writeFileSync("circle-entity-recovery.json", JSON.stringify({ raw }), { flag: "wx" });
// only THEN encrypt + POST
```
Add note: even with this, Console-side registration is the reliable path for brand-new accounts (409 keeps happening).

### 6. Failure-modes table additions
Append rows:
- `rpc.testnet.arc.io` DNS fails → use `rpc.testnet.arc.network`
- User confused Privy modal shows USDC while approving EURC → gas token ≠ approval token; render your own summary
- cirBTC "approve" step silently skipped → env var unset → address is `0x000…000` → gate in UI
- 409 on entity-secret even on brand-new account → Console-configurator path, not API

### 7. Success checkpoints (new short section)
End with a "You know it worked when…" list so the next agent has a shipping definition:
- Bootstrap prints wallet ID + address; recovery JSON on disk
- Treasury funded from `faucet.circle.com` (Arc Testnet)
- Deploy script polls to `status: "COMPLETE"` and writes `src/data/contract.json`
- Arcscan shows verified checkmark; `is_verified: true` in API
- Privy Google login → embedded wallet on chain 5042002 → approve+log tx confirmed on Arcscan

## Delivery

- Edit `.agents/skills/lovable-arc/SKILL.md` (copy current active version there first).
- Call `skills--apply_draft` on `.agents/skills/lovable-arc`.
- No project code changes.
