## What you're seeing

That "18.744233 USDC" line in the Privy modal is **not** the token you're paying with — it's the wallet's **gas balance** (USDC, since USDC is gas on Arc). Privy always shows the gas-fee token there, regardless of which ERC-20 you're approving.

The actual token being approved IS correct:
- EURC screenshot → `Token address: 0x89B...D72a` ✅ (matches `TOKENS.EURC`)
- cirBTC screenshot → tx `data` starts with `0xa1f2e8aa` = `log(address,uint256,string)` on the contract (the approve step was skipped because `VITE_CIRBTC_ADDRESS` is unset → cirBTC address is `0x000…000`, so `MintForm` bypasses approval and goes straight to `log`)

The "Approval amount" row is blank because Privy's modal doesn't know EURC/cirBTC decimals+symbol to render a human-readable amount — it only auto-formats known tokens (USDC on Arc). This is a Privy UI limitation, not a bug in our code.

## Root cause summary

| Symptom | Cause |
|---|---|
| Modal shows "USDC" balance while approving EURC | Privy displays wallet's gas-token balance, not the approval token |
| "Approval amount" empty | Privy has no token metadata for EURC/cirBTC to format the raw uint256 |
| cirBTC "approve" step missing | `VITE_CIRBTC_ADDRESS` unset → address is zero → `MintForm` intentionally skips approve |

## Plan

Make it obvious in **our** UI what the user is actually approving, since Privy's modal won't:

1. **Add a pre-confirmation summary above the button** in `src/components/dance/MintForm.tsx`:
   - "You'll approve **{amount} {symbol}** to be spent by the DanceMoveTokens contract, then log the move."
   - Show the token contract address (short) so it matches the `Token address` line in Privy.

2. **Fix cirBTC UX** — when `TOKENS.cirBTC.address` is the zero address, disable the cirBTC button in `TokenSwitcher` and show a note ("Set `VITE_CIRBTC_ADDRESS` to enable"), instead of silently skipping approval.

3. **No contract or chain changes.** Frontend-only, presentation code.

### Technical notes
- Privy's approval modal formatting for non-USDC ERC-20s is out of our control; documenting this in the skill file could save future confusion but isn't required.
- The zero-address short-circuit in `MintForm.onSubmit` stays — we just gate the UI so users can't select it in that state.