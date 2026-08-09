// Constants shared by scripts/deploy-midnight.mjs AND every *.server.ts append path.
// Mismatch = RpcError 1010 Custom error: 117. Keep in ONE place.
export const GENESIS_SEED =
  "0000000000000000000000000000000000000000000000000000000000000002";
export const PRIVATE_STATE_STORE = "streetrail-midnight-priv";
export const PRIVATE_STATE_ID = "streetrail-midnight-state";
export const PRIVATE_STORAGE_PASSWORD = "StreetRail-Midnight-2026!";
/** Deterministic 32-byte witness secret (hex). Must match across deploy + append. */
export const DEPLOYER_SECRET_HEX =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00";

export const CONTRACTS = {
  moveRegistry: {
    name: "move-registry",
    source: "MoveRegistry.compact",
    witness: "localSecretKey" as const,
    domain: "abodc:author:v1",
  },
  mandateVault: {
    name: "mandate-vault",
    source: "MandateVault.compact",
    witness: "buyerSecret" as const,
    domain: "ap2:buyer:v1",
  },
  orderLedger: {
    name: "order-ledger",
    source: "OrderLedger.compact",
    witness: "merchantSecret" as const,
    domain: "ucp:merchant:v1",
  },
  midnightUsdc: {
    name: "midnight-usdc",
    source: "MidnightUSDC.compact",
    witness: "localSecretKey" as const,
    domain: "musdc:signer:v1",
  },
  moveNft: {
    name: "move-nft",
    source: "MoveNft.compact",
    witness: "localSecretKey" as const,
    domain: "movenft:minter:v1",
  },
} as const;

export type ContractKey = keyof typeof CONTRACTS;

export const PRIMARY_CONTRACT = CONTRACTS.moveRegistry.name;
export const APP_TAG = "streetrail_move_registry";

export function padBytes32(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  if (enc.length > 32) {
    throw new Error(`padBytes32: "${s}" exceeds 32 UTF-8 bytes`);
  }
  const out = new Uint8Array(32);
  out.set(enc);
  return out;
}

export function hexToBytes32(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(h)) {
    throw new Error("Expected 32-byte hex string");
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function deployerSecretBytes(): Uint8Array {
  return hexToBytes32(DEPLOYER_SECRET_HEX);
}
