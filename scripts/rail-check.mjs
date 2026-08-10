#!/usr/bin/env bun
/**
 * MoveNft rail check.
 * Modes: faucet | mint | list <tokenId> | buy <tokenId> | full
 */
import {
  mintMoveNft,
  listMoveNft,
  buyMoveNft,
  listMoveNftListings,
  listOwnedMoveNfts,
} from "../src/lib/move-nft.server.ts";
import { musdcFaucet } from "../src/lib/musdc.server.ts";

const mode = process.argv[2] ?? "full";
const arg = process.argv[3];

if (mode === "faucet") {
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

if (mode === "mint") {
  const minted = await mintMoveNft({
    ownerLabel: "mn_addr_seller_e2e",
    uri: JSON.stringify({
      kind: "move-log",
      cid: "bafyRailCheck",
      at: new Date().toISOString(),
    }),
  });
  console.log("MINT_OK", JSON.stringify(minted));
  process.exit(0);
}

if (mode === "list") {
  if (!arg) throw new Error("list requires tokenId");
  const listed = await listMoveNft({
    tokenId: arg,
    ownerLabel: "mn_addr_seller_e2e",
    priceAtomic: "5000000",
  });
  console.log("LIST_OK", JSON.stringify(listed));
  console.log("listings", JSON.stringify(await listMoveNftListings()));
  process.exit(0);
}

if (mode === "buy") {
  if (!arg) throw new Error("buy requires tokenId");
  const bought = await buyMoveNft({
    tokenId: arg,
    buyerLabel: "mn_addr_buyer_e2e",
  });
  console.log("BUY_OK", JSON.stringify(bought));
  console.log("buyer", JSON.stringify(await listOwnedMoveNfts("mn_addr_buyer_e2e")));
  process.exit(0);
}

if (mode === "oneproc" || mode === "full") {
  console.log("→ mint");
  const minted = await mintMoveNft({
    ownerLabel: "mn_addr_seller_e2e",
    uri: JSON.stringify({
      kind: "move-log",
      cid: "bafyOneProc",
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

  console.log("→ faucet");
  try {
    console.log(await musdcFaucet());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already claimed/i.test(msg)) console.log("faucet already claimed");
    else throw e;
  }

  console.log("→ buy");
  const bought = await buyMoveNft({
    tokenId: minted.tokenId,
    buyerLabel: "mn_addr_buyer_e2e",
  });
  console.log("bought", bought);
  console.log("buyer", await listOwnedMoveNfts("mn_addr_buyer_e2e"));
  console.log("E2E_OK");
  process.exit(0);
}

throw new Error(`unknown mode ${mode}`);
