# Cursor Input — Midnight MoveNft Undeployed build notes

Lessons from shipping StreetRail’s Compact Move Rights NFT rail (mint → list → buy with mUSDC) on Midnight Local Undeployed, and related Pinata / GitHub work.

---

## Successes

1. **End-to-end rail works on Undeployed**  
   Prove & append → MoveNft mint → market list → mUSDC pay → buy, with activity in the local ledger + indexer links. Verified with `scripts/z-check.mjs` / `scripts/e2e-move-nft.mjs` after a clean deploy (`E2E_OK`).

2. **Undeployed write path is server-append**  
   Lace cannot sign on Undeployed. Matching existing MoveRegistry / mUSDC patterns (genesis wallet + `findDeployedContract` + `callTx`) unblocked the demo without pretending Lace works locally.

3. **Insert-only Compact maps unblocked list/buy**  
   Root cause of repeated `feesWithMargin` / `transaction_merge` Unreachable: dust-wallet fee balancing panics when a circuit **updates an existing map key**. Mint/list insert new keys; buy/transfer append to a `sales` map with a fresh random id; current owner lives in the local JSON mirror for the demo.

4. **`list` is a Compact keyword**  
   Circuit renamed to `listSale` with matching prover/verifier artefacts. Calling `callTx.list` against `listSale` keys is a silent footgun.

5. **Prefer deploy JSON over stale `VITE_*` addresses**  
   Vite caches env across redeploys. Reading `src/data/midnight-contract.undeployed.json` (and resetting move-nft state on deploy) avoided “mint to dead contract” confusion.

6. **mUSDC settlement sequenced in the API**  
   No cross-contract Compact call in v1: `musdcFaucet` / `musdcTransfer` then `MoveNft.buy` in one server handler. Documented as demo atomicity (same genesis wallet).

7. **UI off the Arc pause path**  
   Market / gallery / activity rewired for Midnight + indexer when `VITE_NETWORK_ID=undeployed`, so Prove & append produces something listable instead of an amber “nothing to sell” banner.

8. **Pinata stays server-only**  
   `PINATA_JWT` / `PINATA_GATEWAY` never use the `VITE_` prefix (Arc/Cloudflare trap). MintForm enables clip UI from server config.

9. **Git hygiene for Lovable**  
   No force-push / rebase of published history. `.env` untracked; LevelDB gitignored.

---

## Failures / traps

1. **Second `callTx` on the same genesis wallet after map overwrites**  
   Mint succeeded; list/buy failed with `Wallet.Other: wasm.transaction_feesWithMargin` or `transaction_merge` Unreachable. Looked like “cache invalidation” or “process isolation” for a long time; the real fix was insert-only ledger design + fresh wallet per call (`withMoveNft`, same idea as mUSDC `withMusdc`).

2. **RpcError 117 / 104 / 196**  
   - **117**: stale private state / LevelDB vs chain (concurrent clients, killed mid-prove, wipe LevelDB without redeploy).  
   - **104**: dirty LevelDB after a failed faucet/mint handoff.  
   - **196**: verifier key mismatch (recompiled artefacts without redeploy, or deploy against wrong keys).

3. **Competing agents killing each other’s processes**  
   Parallel Cursor shells `pkill`’d `bun -e`, `e2e-move`, `deploy-midnight`, and wiped `midnight-level-db` mid-run. Symptoms: “exit 0” with truncated logs, empty tee output, deploy JSON timestamps that didn’t match the run. Use uniquely named scripts (`z-check.mjs`) and never broadly pkill shared patterns while another job holds the stack.

4. **Piping long proves through `awk`/`head`**  
   SIGPIPE killed prove processes; e2e looked flaky. Prefer `tee` to a log file and `rg` afterward.

5. **Faucet before mint in the same LevelDB session**  
   Opening mUSDC then MoveNft on the shared genesis LevelDB left the next MoveNft submit broken. Order that worked for full rail: mint → list → faucet (if needed) → pay → buy, with wallet `stop()` between contract families.

6. **Wrong owner PK in diagnostics**  
   Server uses `sha256("movenft:owner:v1:" + label)`; ad-hoc scripts used raw `sha256(label)` → on-chain `not owner` while local ledger looked fine.

7. **Vite not restarted after redeploy**  
   SSR kept old contract addresses until process restart. Redeploy ⇒ restart `bun run dev`.

8. **README / GitHub drift**  
   Docs described MoveNft while substantial code was still local-only; a follow-up push was required so Zealy/GitHub matched the README.

9. **macOS has no `flock`**  
   Exclusive locks need `mkdir`-based locks or careful process naming, not Linux `flock`.

---

## How we would do it differently

1. **Design Compact for Undeployed dust limits first**  
   Assume insert-only / append-only public maps for v1 demos. Defer lookup-heavy ownership checks to the server mirror (or a later shielded design). Don’t start from an ERC-721-shaped Compact with many overwrites.

2. **One exclusive “stack owner” process for e2e**  
   Single script: compile → artefacts → wipe LevelDB → deploy → mint/list/buy. No parallel agents on the same Docker stack. Marker file + refuse to start if another owner holds it.

3. **Contract the e2e surface**  
   One script name (`z-check.mjs`), logs only to `/tmp/…`, exit non-zero on any step failure, print a single `E2E_OK` line. Avoid multi-agent “continue e2e” forks.

4. **Redeploy protocol as a checklist**  
   After any Compact change:  
   `midnight:compile` → `midnight:artefacts` → `rm -rf midnight-level-db .midnight` → `midnight:deploy` → restart Vite → run e2e. Never mix new keys with an old LevelDB or old on-chain state.

5. **Keep deploy address resolution in one helper**  
   Always: undeployed JSON first, then env. Unit-test that helper so `VITE_*` staleness can’t recur.

6. **Separate “wallet session” from “HTTP request” in docs**  
   Document clearly: Undeployed demo = server genesis wallet; preview/preprod = Lace. Don’t half-wire Lace signing on Undeployed.

7. **Push submission artefacts early**  
   For Zealy (`zealymidnight`), keep README, Compact sources, managed artefacts, and this note in sync with every working e2e—not a final dump after the demo works.

8. **Pinata / secrets**  
   Document `PINATA_JWT` in `.env.example` only; never `VITE_PINATA_*`. Restart dev after env changes.

9. **Out of scope until the rail is green**  
   OZ NonFungibleToken vendor, true cross-contract atomic buy, re-enabling Circle Arc mint—park them until Undeployed mint/list/buy is boringly reliable.

---

## Useful commands

```bash
bun run midnight:status
bun run midnight:compile && bun run midnight:artefacts
rm -rf midnight-level-db .midnight && bun run midnight:deploy
bun scripts/z-check.mjs          # mint → list → buy
bun run dev                      # http://localhost:8080/
```

---

## Outcome snapshot

| Item | Status |
|------|--------|
| MoveNft Compact + artefacts | Working (insert-only / `listSale` / `sales`) |
| Server mint/list/buy/cancel/transfer | Working |
| MintForm → append + mint | Working |
| Market UI on Undeployed | Working |
| E2E mint → list → buy + mUSDC | Verified (`E2E_OK`) |
| Pinata clip pin (optional JWT) | Wired server-side |
| Arc ERC-721 market | Feature-gated / out of Undeployed path |

---

*Written for the Zealy Midnight submission and future Cursor agents touching this stack.*
