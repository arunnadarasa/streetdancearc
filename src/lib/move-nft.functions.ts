import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const labelSchema = z.string().trim().min(3).max(200);

export const getMoveNftConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { readMoveNftAddress } = await import("@/lib/move-nft.server");
  try {
    const address = readMoveNftAddress();
    return { configured: true as const, address, detail: null };
  } catch (e) {
    return {
      configured: false as const,
      address: "",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
});

export const listMidnightMoveNfts = createServerFn({ method: "GET" })
  .inputValidator((input: { owner: string }) => z.object({ owner: labelSchema }).parse(input))
  .handler(async ({ data }) => {
    const { listOwnedMoveNfts } = await import("@/lib/move-nft.server");
    return listOwnedMoveNfts(data.owner);
  });

export const listMidnightMoveListings = createServerFn({ method: "GET" }).handler(async () => {
  const { listMoveNftListings } = await import("@/lib/move-nft.server");
  return listMoveNftListings();
});

export const listMidnightMoveActivity = createServerFn({ method: "GET" }).handler(async () => {
  const { listMoveNftActivity } = await import("@/lib/move-nft.server");
  return listMoveNftActivity();
});

export const mintMidnightMoveNft = createServerFn({ method: "POST" })
  .inputValidator((input: { ownerLabel: string; uri: string }) =>
    z
      .object({
        ownerLabel: labelSchema,
        uri: z.string().trim().min(1).max(20_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { mintMoveNft } = await import("@/lib/move-nft.server");
    return mintMoveNft(data);
  });

export const listMidnightMoveForSale = createServerFn({ method: "POST" })
  .inputValidator((input: { tokenId: string; ownerLabel: string; priceAtomic: string }) =>
    z
      .object({
        tokenId: z.string().regex(/^\d+$/),
        ownerLabel: labelSchema,
        priceAtomic: z.string().regex(/^\d+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { listMoveNft } = await import("@/lib/move-nft.server");
    return listMoveNft(data);
  });

export const cancelMidnightMoveListing = createServerFn({ method: "POST" })
  .inputValidator((input: { tokenId: string; ownerLabel: string }) =>
    z.object({ tokenId: z.string().regex(/^\d+$/), ownerLabel: labelSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { cancelMoveNft } = await import("@/lib/move-nft.server");
    return cancelMoveNft(data);
  });

export const buyMidnightMoveNft = createServerFn({ method: "POST" })
  .inputValidator((input: { tokenId: string; buyerLabel: string }) =>
    z.object({ tokenId: z.string().regex(/^\d+$/), buyerLabel: labelSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { buyMoveNft } = await import("@/lib/move-nft.server");
    return buyMoveNft(data);
  });

export const transferMidnightMoveNft = createServerFn({ method: "POST" })
  .inputValidator((input: { tokenId: string; fromLabel: string; toLabel: string }) =>
    z
      .object({
        tokenId: z.string().regex(/^\d+$/),
        fromLabel: labelSchema,
        toLabel: labelSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { transferMoveNft } = await import("@/lib/move-nft.server");
    return transferMoveNft(data);
  });
