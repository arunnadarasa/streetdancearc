#!/usr/bin/env bun
/**
 * Mint → listSale → buy on Undeployed MoveNft.
 *
 * Important: do NOT open the mUSDC genesis wallet in the same process before
 * mint/list — that leaves LevelDB in a state where the second MoveNft callTx
 * trips wasm.transaction_feesWithMargin. Fund mUSDC in a prior process:
 *   bun scripts/verify-movenft-rail.mjs faucet
 *   bun scripts/verify-movenft-rail.mjs api
 */
import {
  mintMoveNft,
  listMoveNft,
  buyMoveNft,
  listMoveNftListings,
  listOwnedMoveNfts,
} from "../src/lib/move-nft.server.ts";
import { musdcFaucet } from "../src/lib/musdc.server.ts";

const mode = process.argv[2] ?? "api";

if (mode === "faucet") {
  console.log("→ faucet");
  try {
    console.log(await musdcFaucet());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already claimed/i.test(msg)) console.log("faucet already claimed");
    else throw e;
  }
  console.log("FAUCET_DONE");
  process.exit(0);
}

console.log("→ mint");
const minted = await mintMoveNft({
  ownerLabel: "mn_addr_seller_e2e",
  uri: JSON.stringify({
    kind: "move-log",
    cid: "bafyVerifyRail",
    at: new Date().toISOString(),
  }),
});
console.log("minted", minted);

console.log("→ list");
const listed = await listMoveNft({
  tokenId: minted.tokenId,
  ownerLabel: "mn_addr_seller_e2e",
  priceAtomic: "5000000",
});
console.log("listed", listed);
console.log("listings", await listMoveNftListings());

console.log("→ buy");
const bought = await buyMoveNft({
  tokenId: minted.tokenId,
  buyerLabel: "mn_addr_buyer_e2e",
});
console.log("bought", bought);
console.log("buyer", await listOwnedMoveNfts("mn_addr_buyer_e2e"));
console.log("E2E_OK");
process.exit(0);
