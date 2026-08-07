# README update plan

Refresh `README.md` to reflect the features shipped since the last edit, without rewriting the whole file.

## Updates

1. **On-chain claim offers (A2H)**
   - Add a short paragraph under the A2H mode section explaining that "Claim offer" is an agent-side on-chain receipt.
   - Describe the flow: Drop Agent logs the claim to `DanceMoveTokens` via Circle SCP, returns a claim code + Arcscan receipt + signed AP2 claim, discount is applied at checkout.
   - Note that claims do not count against payout caps.

2. **ERC-1271 treasury authorization**
   - Add a new subsection under "On-chain" for `StreetRailAuthorizer.sol`.
   - Include the deployed address and Arcscan link.
   - Explain the two modes: pre-approved digests via `approveHash` and time-boxed delegate signers.
   - Mention that A2H payouts and mandate renewals carry an `onChainAuth` block and the inbox shows the `0x1626ba7e` magic value.

3. **Treasury panel**
   - Add one bullet under "Balances" or "Circle products used" noting the in-app treasury balance/address panel and the low-gas warning.

4. **Lovable Cloud**
   - Update "Local setup" to mention that Lovable Cloud (managed PostgreSQL/Auth/Storage) is now enabled, while still listing the required secrets.

5. **Reference links**
   - Add Arcscan links for the authorizer contract and the GitHub repo link is already present.

## Out of scope

- No code changes.
- No new routes or features.
