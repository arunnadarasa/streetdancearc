# README lessons-learned update

Add a polished, public-repo-ready "Lessons learned" appendix to the end of `README.md`. It will cover both the hackathon build journey and the product/architecture choices, with four sub-sections:

1. **What worked (Successes)** — e.g. Circle SCP deploy/verify flow, the same-rail four-mode architecture, live FX feed, proxying RPC through `/api/public/arc-rpc`, and getting real on-chain A2H payouts working.
2. **What broke (Failures)** — e.g. Privy `PRIVY_APP_ID` propagation in mobile previews, initial Circle entity-secret registration conflicts, Zod negotiation schema mismatches, hardcoded seeded A2H data before on-chain wiring, and the friction of multi-decimal stablecoins (USDC 6 vs cirBTC 8).
3. **Best practices we landed on** — secrets-only config, server-side signing/RSA-OAEP for Circle, using a public RPC proxy instead of shipping keys, canonical JSON + Ed25519 for AP2 mandates, and keeping the contract under 100 lines.
4. **What we would do differently next time** — e.g. start with a schema-first A2A protocol contract, use a dedicated testnet faucet/monitoring service, add e2e agent tests, separate the move-registry fee model from merch payments earlier, and pin all token addresses via a chain config package.

No other files change. After approval, edit `README.md` only and let GitHub sync push the update.
