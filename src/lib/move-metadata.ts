import type { TokenKey } from "@/lib/tokens";
import { TOKENS } from "@/lib/tokens";

export const DISCIPLINES = [
  "Breaking",
  "Popping",
  "Locking",
  "House",
  "Krump",
  "Waacking",
  "Hip-Hop",
  "Litefeet",
  "Voguing",
  "Afro",
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

export interface MoveMedia {
  cid: string;
  uri: string;
  gateway: string;
  mimeType: string;
  size: number;
}

export interface MoveMetadataInput {
  move: string;
  discipline: string;
  rightsHolder: string;
  license: string;
  token: TokenKey;
  amount: string;
  media?: MoveMedia | null;
}

export interface MoveMetadata {
  schema: "streetrail/move-rights@1";
  /** ERC-721 display name (what wallets and marketplaces show). */
  name: string;
  description: string;
  image?: string;
  animation_url?: string;
  media?: MoveMedia;
  attributes: Array<{ trait_type: string; value: string }>;
  move: string;
  discipline: string;
  rights: {
    holder: string;
    license: string;
    territory: "worldwide";
  };
  payment: {
    token: string;
    tokenAddress: string;
    decimals: number;
    amount: string;
    chainId: number;
  };
}

export const LICENSES = [
  "commercial-sync",
  "social-clip",
  "class-teaching",
  "battle-broadcast",
] as const;

export function buildMoveMetadata(input: MoveMetadataInput): MoveMetadata {
  const cfg = TOKENS[input.token];
  const move = input.move.trim() || "Untitled move";
  const holder = input.rightsHolder.trim() || "unattributed";
  const media = input.media ?? undefined;
  const isVideo = media ? media.mimeType.startsWith("video/") : false;

  return {
    schema: "streetrail/move-rights@1",
    name: `${move} · ${input.discipline}`,
    description: `On-chain rights record for the ${input.discipline} move "${move}", held by ${holder} under a ${input.license} licence.`,
    ...(media ? (isVideo ? { animation_url: media.gateway } : { image: media.gateway }) : {}),
    ...(media ? { media } : {}),
    attributes: [
      { trait_type: "Discipline", value: input.discipline },
      { trait_type: "Licence", value: input.license },
      { trait_type: "Rights holder", value: holder },
      { trait_type: "Settlement token", value: cfg.symbol },
      { trait_type: "Evidence", value: media ? "clip pinned" : "text only" },
    ],
    move,
    discipline: input.discipline,
    rights: {
      holder,
      license: input.license,
      territory: "worldwide",
    },
    payment: {
      token: cfg.symbol,
      tokenAddress: cfg.address,
      decimals: cfg.decimals,
      amount: input.amount || "0",
      chainId: 5042002,
    },
  };
}

const B32 = "abcdefghijklmnopqrstuvwxyz234567";

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/**
 * CIDv1, raw codec (0x55), sha2-256 multihash — the same CID an IPFS
 * `add --raw-leaves --cid-version 1` would produce for this exact JSON body.
 */
export async function computeCid(json: string): Promise<string> {
  return computeBytesCid(new TextEncoder().encode(json));
}

/**
 * Content hash for arbitrary bytes as a CIDv1/raw/sha2-256.
 *
 * Superseded for clip uploads: clips are hashed with the real UnixFS chunked
 * algorithm in `@/lib/ipfs-cid` so the result is directly comparable to the
 * pinned CID. This raw variant remains for small in-memory payloads.
 */
export async function computeBytesCid(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
  const out = new Uint8Array(4 + digest.length);
  out[0] = 0x01; // CIDv1
  out[1] = 0x55; // raw
  out[2] = 0x12; // sha2-256
  out[3] = 0x20; // 32 bytes
  out.set(digest, 4);
  return `b${base32(out)}`;
}

/** IPFS block size used when chunking files (see `@/lib/ipfs-cid`). */
export const IPFS_BLOCK_BYTES = 256 * 1024;



export function serializeMetadata(meta: MoveMetadata): string {
  return JSON.stringify(meta, null, 2);
}
