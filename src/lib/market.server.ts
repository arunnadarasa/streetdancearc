// Server-only reads for the Move Rights marketplace on Arc Testnet.
//
// The market contract is non-custodial: sellers keep their token and only
// grant an approval, so every listing is verified against live ownership
// before it is shown.

import { createPublicClient, http, type Address } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import market from "@/data/move-market.json";
import nft from "@/data/move-nft.json";
import { TOKENS, type TokenKey } from "@/lib/tokens";

const ZERO = "0x0000000000000000000000000000000000000000";

export const MARKET_ADDRESS = market.address as Address;
export const MARKET_ABI = market.abi;

export function marketConfigured(): boolean {
  return Boolean(market.address) && market.address.toLowerCase() !== ZERO;
}

const ERC721_ABI = [
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

function client() {
  const url = process.env["ARC_LOGS_RPC_URL"] || "https://rpc.testnet.arc.network";
  return createPublicClient({ chain: arcTestnet, transport: http(url) });
}

function tokenKeyFor(address: string): TokenKey | null {
  const lower = address.toLowerCase();
  const hit = (Object.keys(TOKENS) as TokenKey[]).find((k) => TOKENS[k].address.toLowerCase() === lower);
  return hit ?? null;
}

function gatewayFor(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const base = process.env["PINATA_GATEWAY"]
      ? `https://${process.env["PINATA_GATEWAY"].replace(/^https?:\/\//, "").replace(/\/+$/, "")}/ipfs`
      : "https://gateway.pinata.cloud/ipfs";
    return `${base}/${uri.slice("ipfs://".length)}`;
  }
  return uri.startsWith("http") ? uri : null;
}

export interface MarketListing {
  tokenId: string;
  seller: string;
  payToken: string;
  tokenKey: TokenKey | null;
  symbol: string;
  decimals: number;
  priceAtomic: string;
  price: string;
  name: string | null;
  discipline: string | null;
  license: string | null;
  mediaUrl: string | null;
  mediaKind: "video" | "image" | null;
  explorerUrl: string;
  /** ERC-2981 royalty carved out of the price, in atomic units. "0" when none. */
  royaltyAtomic: string;
  royalty: string;
  royaltyReceiver: string | null;
  /** What the seller actually receives after the royalty carve-out. */
  sellerNetAtomic: string;
  sellerNet: string;
  /** Royalty as a percentage of the price, e.g. 5 for 5%. */
  royaltyPercent: number;
}

function formatUnits(atomic: bigint, decimals: number): string {
  const s = atomic.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** Read every active listing. Never throws. */
export async function listMarket(max = 24): Promise<{
  items: MarketListing[];
  market: string;
  nft: string;
  configured: boolean;
  detail: string | null;
}> {
  const base = { market: MARKET_ADDRESS, nft: nft.address, configured: marketConfigured() };
  if (!marketConfigured()) {
    return { ...base, items: [], detail: "The marketplace contract is not deployed yet." };
  }

  const pub = client();
  let count: bigint;
  try {
    count = (await pub.readContract({
      address: MARKET_ADDRESS,
      abi: MARKET_ABI,
      functionName: "activeCount",
    })) as bigint;
  } catch {
    return { ...base, items: [], detail: "Arc RPC could not read the marketplace right now." };
  }

  const n = Number(count > BigInt(max) ? BigInt(max) : count);
  const raw = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      try {
        return (await pub.readContract({
          address: MARKET_ADDRESS,
          abi: MARKET_ABI,
          functionName: "listingAt",
          args: [BigInt(i)],
        })) as readonly [bigint, Address, Address, bigint];
      } catch {
        return null;
      }
    }),
  );

  const items = await Promise.all(
    raw
      .filter((r): r is readonly [bigint, Address, Address, bigint] => r !== null)
      .map(async ([tokenId, seller, payToken, priceAtomic]): Promise<MarketListing | null> => {
        // Drop stale listings where the seller no longer holds the token.
        try {
          const owner = (await pub.readContract({
            address: nft.address as Address,
            abi: ERC721_ABI,
            functionName: "ownerOf",
            args: [tokenId],
          })) as Address;
          if (owner.toLowerCase() !== seller.toLowerCase()) return null;
        } catch {
          /* keep the listing if ownership can't be read */
        }

        const key = tokenKeyFor(payToken);
        const decimals = key ? TOKENS[key].decimals : 6;

        let name: string | null = null;
        let discipline: string | null = null;
        let license: string | null = null;
        let mediaUrl: string | null = null;
        let mediaKind: "video" | "image" | null = null;

        try {
          const uri = (await pub.readContract({
            address: nft.address as Address,
            abi: ERC721_ABI,
            functionName: "tokenURI",
            args: [tokenId],
          })) as string;
          const gw = gatewayFor(uri);
          if (gw) {
            const res = await fetch(gw, { signal: AbortSignal.timeout(5_000) });
            if (res.ok) {
              const meta = (await res.json()) as {
                name?: string;
                move?: string;
                discipline?: string;
                rights?: { license?: string };
                animation_url?: string;
                image?: string;
              };
              name = meta.name ?? meta.move ?? null;
              discipline = meta.discipline ?? null;
              license = meta.rights?.license ?? null;
              mediaUrl = meta.animation_url ?? meta.image ?? null;
              mediaKind = meta.animation_url ? "video" : meta.image ? "image" : null;
            }
          }
        } catch {
          /* metadata unreachable — still list the token */
        }

        let royaltyAtomic = 0n;
        let royaltyReceiver: string | null = null;
        try {
          const [receiver, amount] = (await pub.readContract({
            address: MARKET_ADDRESS,
            abi: MARKET_ABI,
            functionName: "royaltyFor",
            args: [tokenId, priceAtomic],
          })) as readonly [Address, bigint];
          if (amount > 0n && receiver.toLowerCase() !== ZERO) {
            royaltyAtomic = amount;
            royaltyReceiver = receiver;
          }
        } catch {
          /* older market build without royaltyFor — treat as no royalty */
        }
        const sellerNetAtomic = priceAtomic - royaltyAtomic;

        return {
          tokenId: tokenId.toString(),
          seller,
          payToken,
          tokenKey: key,
          symbol: key ? TOKENS[key].symbol : "token",
          decimals,
          priceAtomic: priceAtomic.toString(),
          price: formatUnits(priceAtomic, decimals),
          name,
          discipline,
          license,
          mediaUrl,
          mediaKind,
          explorerUrl: `${nft.explorer}/token/${nft.address}/instance/${tokenId.toString()}`,
          royaltyAtomic: royaltyAtomic.toString(),
          royalty: formatUnits(royaltyAtomic, decimals),
          royaltyReceiver,
          sellerNetAtomic: sellerNetAtomic.toString(),
          sellerNet: formatUnits(sellerNetAtomic, decimals),
          royaltyPercent:
            priceAtomic > 0n ? Number((royaltyAtomic * 10000n) / priceAtomic) / 100 : 0,
        } satisfies MarketListing;
      }),
  );

  return { ...base, items: items.filter((i): i is MarketListing => i !== null), detail: null };
}
