// Thin server-function wrappers for the Move Rights marketplace.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";



export const getMarketConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { MARKET_ADDRESS, MARKET_ABI, marketConfigured } = await import("@/lib/market.server");
  const nft = (await import("@/data/move-nft.json")).default;
  return {
    configured: marketConfigured(),
    market: MARKET_ADDRESS,
    abi: MARKET_ABI,
    nft: nft.address,
    explorer: nft.explorer,
  };
});

export const listMarketListings = createServerFn({ method: "GET" }).handler(async () => {
  const { listMarket } = await import("@/lib/market.server");
  return listMarket();
});
