// Server-only ERC-721 "Move Rights" helpers.
//
// The contract is Circle's pre-audited SCP ERC-721 template deployed to Arc
// Testnet from the dev-controlled treasury wallet. The treasury holds
// MINTER_ROLE, so moves are minted agent-side: the dancer pays no gas and
// sees no extra wallet prompt.

import { createPublicClient, http, type Address } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { treasuryContractCall } from "@/lib/circle.server";
import nft from "@/data/move-nft.json";

const ZERO = "0x0000000000000000000000000000000000000000";

export const MOVE_NFT_ADDRESS = nft.address as Address;

export function nftConfigured(): boolean {
  return Boolean(nft.address) && nft.address.toLowerCase() !== ZERO;
}

const ERC721_READ_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

function rpcUrl() {
  return process.env["ARC_LOGS_RPC_URL"] || "https://rpc.testnet.arc.network";
}

function pub() {
  return createPublicClient({ chain: arcTestnet, transport: http(rpcUrl()) });
}

export interface MintResult {
  txHash: string;
  explorerUrl: string;
  contract: string;
  tokenUri: string;
}

const MIDNIGHT_NFT =
  "Legacy Arc Move NFT minting is off — use Compact MoveNft via /api/public/move-nft-mint (Prove & mint on /moves).";

/** Mint one move NFT to the dancer, with an ipfs:// token URI. */
export async function mintMove(params: { to: string; cid: string }): Promise<MintResult> {
  if (!process.env["CIRCLE_API_KEY"] || !nftConfigured()) {
    throw new Error(MIDNIGHT_NFT);
  }
  const cid = params.cid.replace(/^ipfs:\/\//, "").trim();
  if (!cid) throw new Error("missing_cid");
  const tokenUri = `ipfs://${cid}`;

  const tx = await treasuryContractCall({
    contractAddress: MOVE_NFT_ADDRESS,
    abiFunctionSignature: "mintTo(address,string)",
    abiParameters: [params.to, tokenUri],
  });

  return {
    txHash: tx.txHash ?? "",
    explorerUrl: `${nft.explorer}/tx/${tx.txHash ?? ""}`,
    contract: MOVE_NFT_ADDRESS,
    tokenUri,
  };
}

export interface OwnedMoveNft {
  tokenId: string;
  tokenUri: string;
  gatewayUrl: string | null;
  name: string | null;
  discipline: string | null;
  license: string | null;
  mediaUrl: string | null;
  mediaKind: "video" | "image" | null;
  explorerUrl: string;
}

function ipfsToGateway(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const base = process.env["PINATA_GATEWAY"]
      ? `https://${process.env["PINATA_GATEWAY"].replace(/^https?:\/\//, "").replace(/\/+$/, "")}/ipfs`
      : "https://gateway.pinata.cloud/ipfs";
    return `${base}/${uri.slice("ipfs://".length)}`;
  }
  return uri.startsWith("http") ? uri : null;
}

/** List the move NFTs owned by an address. Never throws. */
export async function listOwnedMoves(owner: string, max = 12): Promise<{
  items: OwnedMoveNft[];
  contract: string;
  configured: boolean;
  detail: string | null;
}> {
  const base = { contract: MOVE_NFT_ADDRESS, configured: nftConfigured() };
  if (!process.env["CIRCLE_API_KEY"] || !process.env["ARC_LOGS_RPC_URL"]) {
    return {
      ...base,
      configured: false,
      items: [],
      detail: MIDNIGHT_NFT,
    };
  }
  if (!nftConfigured()) {
    return { ...base, items: [], detail: "The move NFT contract is not deployed yet." };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) {
    return { ...base, items: [], detail: null };
  }

  const client = pub();
  let balance: bigint;
  try {
    balance = (await client.readContract({
      address: MOVE_NFT_ADDRESS,
      abi: ERC721_READ_ABI,
      functionName: "balanceOf",
      args: [owner as Address],
    })) as bigint;
  } catch {
    return { ...base, items: [], detail: "Arc RPC could not read your move NFTs right now." };
  }

  const count = Number(balance > BigInt(max) ? BigInt(max) : balance);
  const ids = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      try {
        return (await client.readContract({
          address: MOVE_NFT_ADDRESS,
          abi: ERC721_READ_ABI,
          functionName: "tokenOfOwnerByIndex",
          args: [owner as Address, BigInt(i)],
        })) as bigint;
      } catch {
        return null;
      }
    }),
  );

  const items = await Promise.all(
    ids.filter((id): id is bigint => id !== null).map(async (id) => {
      let tokenUri = "";
      try {
        tokenUri = (await client.readContract({
          address: MOVE_NFT_ADDRESS,
          abi: ERC721_READ_ABI,
          functionName: "tokenURI",
          args: [id],
        })) as string;
      } catch {
        /* keep empty */
      }
      const gatewayUrl = ipfsToGateway(tokenUri);

      let name: string | null = null;
      let discipline: string | null = null;
      let license: string | null = null;
      let mediaUrl: string | null = null;
      let mediaKind: "video" | "image" | null = null;

      if (gatewayUrl) {
        try {
          const res = await fetch(gatewayUrl, { signal: AbortSignal.timeout(5_000) });
          if (res.ok) {
            const meta = (await res.json()) as {
              name?: string;
              move?: string;
              discipline?: string;
              rights?: { license?: string };
              animation_url?: string;
              image?: string;
              media?: { mimeType?: string; gateway?: string };
            };
            name = meta.name ?? meta.move ?? null;
            discipline = meta.discipline ?? null;
            license = meta.rights?.license ?? null;
            mediaUrl = meta.animation_url ?? meta.image ?? meta.media?.gateway ?? null;
            mediaKind = meta.animation_url
              ? "video"
              : meta.image
                ? "image"
                : meta.media?.mimeType?.startsWith("video/")
                  ? "video"
                  : meta.media
                    ? "image"
                    : null;
          }
        } catch {
          /* metadata unreachable — still show the token */
        }
      }

      return {
        tokenId: id.toString(),
        tokenUri,
        gatewayUrl,
        name,
        discipline,
        license,
        mediaUrl,
        mediaKind,
        explorerUrl: `${nft.explorer}/token/${MOVE_NFT_ADDRESS}/instance/${id.toString()}`,
      } satisfies OwnedMoveNft;
    }),
  );

  return { ...base, items, detail: null };
}
