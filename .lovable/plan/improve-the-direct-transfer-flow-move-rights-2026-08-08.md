# Improve the direct transfer flow (Move rights)

Scope: the "Transfer a move" card in `src/components/market/MoveMarketPanel.tsx`. Listing, buying, and cancelling stay as they are.

## What changes for you

1. **Ownership + approval preflight.** Before anything is signed, the app reads the NFT contract on Arc and checks:
   - the move still exists and `ownerOf(tokenId)` equals your connected wallet;
   - whether the token is currently listed on the marketplace (from the listings already loaded);
   - whether the marketplace still holds a blanket `setApprovalForAll` on your wallet, plus any per-token `getApproved` operator.
   Each check produces a plain-language line in the card, so you see the state before you commit.

2. **Explicit confirmation step.** "Transfer rights" no longer sends immediately. It runs the preflight and shows a summary panel: move name and `#tokenId`, from → to (both shortened, recipient shown in full on a second line), a warning if the recipient is your own address, a warning if the token is actively listed (the listing keeps pointing at a token you no longer own — offer "Cancel listing first"), and a reminder that transfer is irreversible. A second button, **Confirm transfer**, actually signs. A **Back** button returns to editing. Changing the token or recipient invalidates the confirmation.

3. **Clear ownership / failure messages.** Replace raw chain errors with mapped copy:
   - not the owner → "Move #N is held by 0xabc…1234, not your wallet. Only the current owner can transfer it."
   - token id doesn't exist → "Move #N does not exist on this contract."
   - user rejected in Privy → "You cancelled the signature. Nothing was sent."
   - insufficient USDC gas → "Not enough USDC for gas on Arc. Top up at faucet.circle.com."
   - anything else → short reason plus the raw detail behind a "Details" disclosure rather than a truncated string.

4. **Post-transfer state.** On success the card shows the Arcscan receipt, clears the recipient, refreshes owned moves, and if the transferred token was still listed, prompts that the stale listing should be cancelled by the new owner.

## Technical notes

- Extend the local `ERC721_ABI` with `ownerOf(uint256) view returns (address)` and `getApproved(uint256) view returns (address)`; reads go through the existing `createPublicClient` on `arcTestnet` (the app's RPC proxy).
- New local state: `transferPreflight` (`null | { owner, isOwner, approvedOperator, listed }`) and `transferStage` (`idle | checking | confirm | sending`). Reset both in the token/recipient `onChange` handlers.
- Add a `mapChainError(e)` helper in the same file (or `src/lib/chain-errors.ts` if reused later) that matches on `ContractFunctionExecutionError`, `UserRejectedRequestError`, and `insufficient funds` before falling back to the raw message.
- Recipient validation gains an EIP-55 checksum-tolerant compare so a lowercase paste is accepted but a self-transfer is flagged.
- Presentation-only elsewhere: no server functions, contracts, or migrations change.
