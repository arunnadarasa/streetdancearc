// Server-only A2H payout engine.
//
// The Rights Agent pushes real value from the Circle treasury wallet to the
// choreographer's wallet and anchors every payout in the DanceMoveTokens
// registry via log(token, amount, cid). The inbox is then read back from those
// on-chain Logged events — nothing here is a fixture.

import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { TOKENS, toAtomic, fromAtomic, type TokenKey } from "@/lib/tokens";
import contract from "@/data/contract.json";
import { treasuryContractCall, treasuryTransfer } from "@/lib/circle.server";

export const REGISTRY = contract.address as Address;

/** Per-payout / daily ceilings expressed in USD, mirrored by the AP2 mandate. */
export const PER_PAYOUT_CAP_USD = 5;
export const DAILY_CAP_USD = 25;

/** Testnet payout size, so a funded treasury survives a day of judging. */
export const PAYOUT_UNIT_USD = 0.002;

const LOGGED = parseAbiItem(
  "event Logged(address indexed author, address indexed token, uint256 amount, string cid, uint256 at)",
);

const CID_PREFIX = "a2h";

function rpcUrl() {
  return process.env["ARC_RPC_URL"] || "https://rpc.testnet.arc.network";
}

function client() {
  return createPublicClient({ chain: arcTestnet, transport: http(rpcUrl()) });
}

export function encodeCid(moveCid: string, to: string) {
  return `${CID_PREFIX}:${moveCid}:${to.toLowerCase()}`;
}

export function decodeCid(cid: string) {
  const parts = cid.split(":");
  if (parts[0] !== CID_PREFIX || parts.length < 3) return null;
  return { moveCid: parts[1] ?? "", to: (parts[2] ?? "").toLowerCase() };
}

function tokenKeyForAddress(address: string): TokenKey {
  const lower = address.toLowerCase();
  const hit = (Object.keys(TOKENS) as TokenKey[]).find(
    (k) => TOKENS[k].address.toLowerCase() === lower,
  );
  return hit ?? "USDC";
}

export interface OnChainPayout {
  txHash: string;
  moveCid: string;
  to: string;
  token: TokenKey;
  value: string;
  atSeconds: number;
  blockNumber: string;
}

/** Read the registry's Logged events, newest first, optionally filtered by recipient. */
export async function readPayouts(to?: string, lookback = 200_000n): Promise<OnChainPayout[]> {
  const pub = client();
  const head = await pub.getBlockNumber();
  const fromBlock = head > lookback ? head - lookback : 0n;
  const logs = await pub.getLogs({ address: REGISTRY, event: LOGGED, fromBlock, toBlock: head });

  const wanted = to?.toLowerCase();
  const out: OnChainPayout[] = [];
  for (const log of logs) {
    const cid = String(log.args.cid ?? "");
    const decoded = decodeCid(cid);
    if (!decoded) continue;
    if (wanted && decoded.to !== wanted) continue;
    const token = tokenKeyForAddress(String(log.args.token ?? ""));
    out.push({
      txHash: log.transactionHash ?? "",
      moveCid: decoded.moveCid,
      to: decoded.to,
      token,
      value: fromAtomic(BigInt(log.args.amount ?? 0n), token),
      atSeconds: Number(log.args.at ?? 0n),
      blockNumber: (log.blockNumber ?? 0n).toString(),
    });
  }
  return out.sort((a, b) => b.atSeconds - a.atSeconds);
}

export interface PayoutResult {
  transferTx: string;
  registryTx: string;
  token: TokenKey;
  value: string;
  to: string;
  moveCid: string;
}

/**
 * Send a payout and anchor it. Two real Arc transactions:
 *   1. treasury -> recipient value transfer (native USDC or ERC-20 transfer())
 *   2. registry log(token, amount, cid) so the rights record exists on chain
 */
export async function sendPayout(params: {
  to: string;
  token: TokenKey;
  amount: string;
  moveCid: string;
}): Promise<PayoutResult> {
  const cfg = TOKENS[params.token];
  const atomic = toAtomic(params.amount, params.token);
  if (atomic <= 0n) throw new Error("payout_amount_zero");

  const transfer = await treasuryTransfer({
    to: params.to,
    amount: params.amount,
    ...(cfg.native ? {} : { tokenAddress: cfg.address }),
  });

  const registry = await treasuryContractCall({
    contractAddress: REGISTRY,
    abiFunctionSignature: "log(address,uint256,string)",
    abiParameters: [cfg.address, atomic.toString(), encodeCid(params.moveCid, params.to)],
  });

  return {
    transferTx: transfer.txHash ?? "",
    registryTx: registry.txHash ?? "",
    token: params.token,
    value: params.amount,
    to: params.to,
    moveCid: params.moveCid,
  };
}
