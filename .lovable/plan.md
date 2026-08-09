# Final submission copy + demo video script

The submission text and track answers are ready to paste (posted in chat). The only missing field is the demo video URL, so this plan covers producing that.

## Add a recording script to the repo

Create `DEMO-SCRIPT.md` at the repo root with a 3-minute shot-by-shot script judges can follow, mirroring the four settlement modes:

```text
0:00-0:20  Hook — StreetRail on Arc, USDC is gas, four modes one rail
0:20-0:55  H2H — buy a snapback, toggle USDC/EURC/cirBTC, settle, Arcscan link
0:55-1:25  H2A — license a move from an agent, x402 challenge, receipt
1:25-2:05  A2A — buyer/seller agents negotiate, deal closes, settlement fires
2:05-2:35  A2H — rights agent detects a move, pays choreographer, claim on-chain
2:35-3:00  /judge — one cross-mode ledger, confirmed txs, 4 verified contracts
```

Each beat lists: what to click, what to say (one sentence), and the on-screen proof (tx hash / Arcscan link).

## Notes

- No app code changes. Documentation only.
- The file syncs to GitHub automatically, so judges can find it next to the README.
