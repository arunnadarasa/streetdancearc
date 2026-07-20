## Plan: Re-run bootstrap cleanly with the fresh Circle API key

The 409 on a brand-new key almost certainly means one of two things:
1. A stale `circle-entity-recovery.json` from the earlier run is being reused, so the script tries to register an *old* entity secret against the new key — but more importantly, any leftover state confuses the flow.
2. The `CIRCLE_API_KEY` secret update form was opened but the new value wasn't actually saved, so the sandbox still runs with the old key.

### Steps

1. **Confirm the secret is really updated.** Read `CIRCLE_API_KEY` prefix from the sandbox env and compare with the fresh key prefix visible in the Circle console screenshot (`TEST_API_KEY:44f0a`, "Street Dance Arc Culture"). If it doesn't match, re-open `update_secret` for `CIRCLE_API_KEY` and wait for submission before proceeding.
2. **Remove stale state.** Delete `circle-entity-recovery.json` so the script generates a brand-new entity secret against the fresh key instead of replaying an older one.
3. **Run bootstrap.** `node scripts/bootstrap-circle.mjs` — with a fresh key + no recovery file, registration should return 200/201, then it creates the `arc-treasury` wallet set and treasury wallet, and writes the address + recovery file.
4. **Report the treasury address** and prompt the user to fund it from the Arc USDC faucet before deploy.

### Fallback

If step 3 still returns 409 on a confirmed-fresh key, dump the exact response body (already logged) and hit Circle's `/config/entity/publicKey` + entitySecret status endpoints to see what state the key is actually in, then adjust — no code changes until we see the real error.

### Not doing

- No frontend edits.
- No changes to `deploy-arc.mjs` / `verify-arc.mjs` yet — those come after treasury is funded.
