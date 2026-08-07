// Thin server-function wrappers for move NFTs + IPFS metadata pinning.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid address");

export const getMoveNftConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { nftConfigured, MOVE_NFT_ADDRESS } = await import("@/lib/nft.server");
  const { pinningEnabled, gatewayBase, MAX_UPLOAD_BYTES } = await import("@/lib/pinata.server");
  return {
    nftConfigured: nftConfigured(),
    nftAddress: MOVE_NFT_ADDRESS,
    pinningEnabled: pinningEnabled(),
    gateway: gatewayBase(),
    maxUploadBytes: MAX_UPLOAD_BYTES,
  };
});

/** Pin the finished move metadata JSON and return its real IPFS CID. */
export const pinMoveMetadata = createServerFn({ method: "POST" })
  .inputValidator((input: { json: string; name?: string }) =>
    z
      .object({
        json: z.string().min(2).max(20_000),
        name: z.string().trim().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { pinJson, pinningEnabled } = await import("@/lib/pinata.server");
    if (!pinningEnabled()) return { pinned: false as const, cid: null, gateway: null };
    let body: unknown;
    try {
      body = JSON.parse(data.json);
    } catch {
      throw new Error("Metadata is not valid JSON.");
    }
    const pin = await pinJson(body, data.name?.trim() || "streetrail-move");
    return { pinned: true as const, cid: pin.cid, gateway: pin.gateway };
  });

/** Mint the move NFT to the dancer, agent-side from the treasury wallet. */
export const mintMoveNft = createServerFn({ method: "POST" })
  .inputValidator((input: { to: string; cid: string }) =>
    z.object({ to: addressSchema, cid: z.string().trim().min(4).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { mintMove } = await import("@/lib/nft.server");
    return mintMove({ to: data.to, cid: data.cid });
  });

export const listMoveNfts = createServerFn({ method: "GET" })
  .inputValidator((input: { owner: string }) => z.object({ owner: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { listOwnedMoves } = await import("@/lib/nft.server");
    return listOwnedMoves(data.owner);
  });
