#!/usr/bin/env bun
import {
  mintMoveNft,
  listMoveNft,
  buyMoveNft,
  listMoveNftListings,
  listOwnedMoveNfts,
} from "../src/lib/move-nft.server.ts";

console.log("→ mint");
const minted = await mintMoveNft({
  ownerLabel: "mn_addr_seller_e2e",
  uri: JSON.stringify({ kind: "move-log", cid: "bafyZ", at: new Date().toISOString() }),
});
console.log("minted", minted);

console.log("→ list");
console.log(
  await listMoveNft({
    tokenId: minted.tokenId,
    ownerLabel: "mn_addr_seller_e2e",
    priceAtomic: "5000000",
  }),
);
console.log("listings", await listMoveNftListings());

console.log("→ buy");
console.log(await buyMoveNft({ tokenId: minted.tokenId, buyerLabel: "mn_addr_buyer_e2e" }));
console.log("buyer", await listOwnedMoveNfts("mn_addr_buyer_e2e"));
console.log("E2E_OK");
