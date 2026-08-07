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

export interface MoveMetadataInput {
  move: string;
  discipline: string;
  rightsHolder: string;
  license: string;
  token: TokenKey;
  amount: string;
}

export interface MoveMetadata {
  schema: "streetrail/move-rights@1";
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
  return {
    schema: "streetrail/move-rights@1",
    move: input.move.trim() || "Untitled move",
    discipline: input.discipline,
    rights: {
      holder: input.rightsHolder.trim() || "unattributed",
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
  const body = new TextEncoder().encode(json);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", body));
  const bytes = new Uint8Array(4 + digest.length);
  bytes[0] = 0x01; // CIDv1
  bytes[1] = 0x55; // raw
  bytes[2] = 0x12; // sha2-256
  bytes[3] = 0x20; // 32 bytes
  bytes.set(digest, 4);
  return `b${base32(bytes)}`;
}

export function serializeMetadata(meta: MoveMetadata): string {
  return JSON.stringify(meta, null, 2);
}
