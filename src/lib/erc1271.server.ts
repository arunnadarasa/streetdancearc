// Server-only ERC-1271 authorization for the StreetRail treasury / rights agent.
//
// Off-chain Ed25519 mandates prove StreetRail issued an authorization. ERC-1271
// makes that authorization verifiable ON Arc by any counterparty (Circle Gateway
// included) without an EOA delegate holding a key: the treasury pre-approves the
// payload digest with a transaction, and `isValidSignature(digest, "")` then
// returns the magic value 0x1626ba7e.

import { createPublicClient, http, keccak256, toHex, type Address } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARC_EXPLORER } from "@/lib/tokens";
import { canonical } from "@/lib/mandate-sign.server";
import { treasuryContractCall, TREASURY_ADDRESS } from "@/lib/circle.server";
import authorizer from "@/data/street-rail-authorizer.json";

export const AUTHORIZER = authorizer.address as Address;
export const ERC1271_MAGIC = "0x1626ba7e";
export const ARC_CAIP2 = "eip155:5042002";

/** Default validity for an on-chain approved digest. */
export const AUTH_TTL_SECONDS = 90 * 86_400;

const ABI = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "digest", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes4" }],
  },
  {
    type: "function",
    name: "isHashApproved",
    stateMutability: "view",
    inputs: [{ name: "digest", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "approvedHashes",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isDelegateValid",
    stateMutability: "view",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function rpcUrl() {
  return process.env["ARC_RPC_URL"] || "https://rpc.testnet.arc.network";
}

function client() {
  return createPublicClient({ chain: arcTestnet, transport: http(rpcUrl()) });
}

/** keccak256 over the canonical JSON of a mandate — same bytes the Ed25519 signer covers. */
export function computeAuthHash(payload: unknown): `0x${string}` {
  return keccak256(toHex(canonical(payload)));
}

export function authorizerUrl() {
  return `${ARC_EXPLORER}/address/${AUTHORIZER}`;
}

export interface OnChainAuth {
  scheme: "erc-1271" | "midnight-mandate-vault";
  authorizer: string;
  authorizerUrl: string;
  network: string;
  hash: string;
  magicValue: string;
  expiresAt: string | null;
  txHash: string | null;
  receiptUrl: string | null;
  valid: boolean;
  detail?: string;
}

/** Read-only: is this digest currently accepted by the contract wallet? */
export async function verify1271(
  hash: `0x${string}`,
  signature: `0x${string}` = "0x",
): Promise<{ valid: boolean; magicValue: string; expiresAt: string | null }> {
  const c = client();
  const [result, expiry] = await Promise.all([
    c.readContract({ address: AUTHORIZER, abi: ABI, functionName: "isValidSignature", args: [hash, signature] }),
    c.readContract({ address: AUTHORIZER, abi: ABI, functionName: "approvedHashes", args: [hash] }),
  ]);
  const magicValue = String(result);
  const exp = Number(expiry ?? 0n);
  return {
    valid: magicValue.toLowerCase() === ERC1271_MAGIC,
    magicValue,
    expiresAt: exp > 0 ? new Date(exp * 1000).toISOString() : null,
  };
}

/**
 * Approve a payload digest on-chain from the Circle treasury wallet.
 * No EOA delegate, no user signature — the contract wallet IS the authorization.
 */
export async function approveAuthOnChain(
  payload: unknown,
  ttlSeconds = AUTH_TTL_SECONDS,
): Promise<OnChainAuth> {
  const hash = computeAuthHash(payload);
  const expirySeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
  const base: OnChainAuth = {
    scheme: "erc-1271",
    authorizer: AUTHORIZER,
    authorizerUrl: authorizerUrl(),
    network: ARC_CAIP2,
    hash,
    magicValue: ERC1271_MAGIC,
    expiresAt: new Date(expirySeconds * 1000).toISOString(),
    txHash: null,
    receiptUrl: null,
    valid: false,
  };

  if (!process.env["CIRCLE_API_KEY"]) {
    return {
      ...base,
      expiresAt: null,
      detail:
        "Legacy ERC-1271 authorizer paused — Undeployed uses Ed25519 mandates (+ optional Compact MandateVault).",
    };
  }

  try {
    const tx = await treasuryContractCall({
      contractAddress: AUTHORIZER,
      abiFunctionSignature: "approveHash(bytes32,uint64)",
      abiParameters: [hash, String(expirySeconds)],
    });
    const txHash = tx.txHash ?? null;
    let valid = false;
    try {
      valid = (await verify1271(hash)).valid;
    } catch {
      valid = Boolean(txHash);
    }
    return {
      ...base,
      txHash,
      receiptUrl: txHash ? `${ARC_EXPLORER}/tx/${txHash}` : null,
      valid,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "erc1271_approve_failed";
    return {
      ...base,
      expiresAt: null,
      detail: humanizeAuthError(message),
    };
  }
}

function humanizeAuthError(message: string): string {
  if (message.includes("Midnight") || message.includes("mUSDC")) {
    return message.slice(0, 200);
  }
  if (message.includes("circle_tx_timeout")) {
    return "The on-chain authorization is still pending at Circle — the off-chain mandate is already valid.";
  }
  if (message.includes("insufficient")) {
    return "The treasury wallet is out of USDC gas, so the digest was not anchored on Arc.";
  }
  if (message.startsWith("circle_")) {
    return "Circle rejected the authorization write — the off-chain mandate still applies.";
  }
  return message.split(":").slice(0, 2).join(": ").slice(0, 160);
}

/** Public description of the contract-wallet authorization path. */
export async function describeAuthorizer() {
  let owner: string | null = null;
  let reachable = true;
  try {
    owner = String(
      await client().readContract({ address: AUTHORIZER, abi: ABI, functionName: "owner" }),
    );
  } catch {
    reachable = false;
  }
  return {
    scheme: "erc-1271",
    standard: "https://eips.ethereum.org/EIPS/eip-1271",
    authorizer: AUTHORIZER,
    authorizerUrl: authorizerUrl(),
    network: ARC_CAIP2,
    chainId: 5042002,
    magicValue: ERC1271_MAGIC,
    owner: owner ?? TREASURY_ADDRESS(),
    treasury: TREASURY_ADDRESS(),
    reachable,
    modes: [
      {
        id: "approved-digest",
        description:
          "The treasury pre-approves a payload digest with a transaction. isValidSignature(digest, 0x) returns the magic value — no EOA delegate or private key involved.",
      },
      {
        id: "delegate-signer",
        description:
          "Optional: a time-boxed delegate EOA may sign digests. isValidSignature(digest, sig65) returns the magic value while the grant is live.",
      },
    ],
    verify: {
      method: "eth_call",
      function: "isValidSignature(bytes32,bytes)",
      rpc: "https://rpc.testnet.arc.network",
    },
  };
}
