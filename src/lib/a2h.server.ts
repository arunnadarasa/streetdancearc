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

/**
 * Log reads use their own endpoint. The Alchemy Arc endpoint (ARC_RPC_URL on
 * the free tier) caps eth_getLogs at a 10-block range, which makes registry
 * history unreadable. The public Arc RPC has no such cap, so it is the default
 * here; override with ARC_LOGS_RPC_URL for a paid archive endpoint.
 */
function logsRpcUrl() {
  return process.env["ARC_LOGS_RPC_URL"] || "https://rpc.testnet.arc.network";
}

function client() {
  return createPublicClient({ chain: arcTestnet, transport: http(rpcUrl()) });
}

function logsClient() {
  return createPublicClient({ chain: arcTestnet, transport: http(logsRpcUrl()) });
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

type RegistryLog = Awaited<ReturnType<ReturnType<typeof logsClient>["getLogs"]>>[number] & {
  args: { cid?: unknown; token?: unknown; amount?: unknown; at?: unknown };
};

function mapLogs(logs: RegistryLog[], wanted?: string): OnChainPayout[] {
  const out: OnChainPayout[] = [];
  for (const log of logs) {
    const decoded = decodeCid(String(log.args.cid ?? ""));
    if (!decoded) continue;
    if (wanted && decoded.to !== wanted) continue;
    const token = tokenKeyForAddress(String(log.args.token ?? ""));
    out.push({
      txHash: log.transactionHash ?? "",
      moveCid: decoded.moveCid,
      to: decoded.to,
      token,
      value: fromAtomic(BigInt((log.args.amount as bigint | undefined) ?? 0n), token),
      atSeconds: Number((log.args.at as bigint | undefined) ?? 0n),
      blockNumber: (log.blockNumber ?? 0n).toString(),
    });
  }
  return out;
}

function isRangeError(e: unknown) {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("block range") ||
    msg.includes("range should work") ||
    msg.includes("limit") ||
    msg.includes("too many") ||
    msg.includes("exceed")
  );
}

/** Payouts settled by this worker instance, so a fresh sweep always shows up. */
const sessionPayouts: OnChainPayout[] = [];

function mergeSession(list: OnChainPayout[], wanted?: string): OnChainPayout[] {
  const seen = new Set(list.map((p) => p.txHash.toLowerCase()));
  const extra = sessionPayouts.filter(
    (p) => !seen.has(p.txHash.toLowerCase()) && (!wanted || p.to === wanted),
  );
  return [...list, ...extra].sort((a, b) => b.atSeconds - a.atSeconds);
}

export interface PayoutHistory {
  payouts: OnChainPayout[];
  degraded: boolean;
  detail: string | null;
}

/**
 * Read the registry's Logged events, newest first, optionally filtered by
 * recipient. Wide-range read first; if the provider caps the block range, fall
 * back to a chunked scan of a recent window. Never throws — degrades instead.
 */
export async function readPayouts(to?: string, lookback = 200_000n): Promise<PayoutHistory> {
  const wanted = to?.toLowerCase();
  const pub = logsClient();

  let head: bigint;
  try {
    head = await pub.getBlockNumber();
  } catch (e) {
    return {
      payouts: mergeSession([], wanted),
      degraded: true,
      detail: e instanceof Error ? e.message : "rpc_unreachable",
    };
  }

  const fromBlock = head > lookback ? head - lookback : 0n;
  try {
    const logs = (await pub.getLogs({
      address: REGISTRY,
      event: LOGGED,
      fromBlock,
      toBlock: head,
    })) as RegistryLog[];
    return { payouts: mergeSession(mapLogs(logs, wanted), wanted), degraded: false, detail: null };
  } catch (e) {
    if (!isRangeError(e)) {
      return {
        payouts: mergeSession([], wanted),
        degraded: true,
        detail: e instanceof Error ? e.message : "registry_read_failed",
      };
    }
  }

  // Chunked fallback: recent window only, provider-safe chunk size, time budget.
  const CHUNK = 10n;
  const WINDOW = 1_000n;
  const deadline = Date.now() + 8_000;
  const start = head > WINDOW ? head - WINDOW : 0n;
  const collected: RegistryLog[] = [];
  let lastError: string | null = null;

  for (let end = head; end >= start; end -= CHUNK) {
    if (Date.now() > deadline) {
      lastError = "partial_scan_timeout";
      break;
    }
    const chunkFrom = end > CHUNK ? end - CHUNK + 1n : 0n;
    try {
      const logs = (await pub.getLogs({
        address: REGISTRY,
        event: LOGGED,
        fromBlock: chunkFrom < start ? start : chunkFrom,
        toBlock: end,
      })) as RegistryLog[];
      collected.push(...logs);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "chunk_read_failed";
    }
    if (chunkFrom === 0n) break;
  }

  return {
    payouts: mergeSession(mapLogs(collected, wanted), wanted),
    degraded: true,
    detail:
      lastError ??
      "The RPC provider limits log queries to a small block range, so only recent history is shown.",
  };
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

  // Remember it locally so the inbox shows the settlement even when the RPC
  // provider caps log history reads.
  sessionPayouts.unshift({
    txHash: registry.txHash ?? transfer.txHash ?? "",
    moveCid: params.moveCid,
    to: params.to.toLowerCase(),
    token: params.token,
    value: params.amount,
    atSeconds: Math.floor(Date.now() / 1000),
    blockNumber: "0",
  });
  if (sessionPayouts.length > 50) sessionPayouts.length = 50;

  return {

    transferTx: transfer.txHash ?? "",
    registryTx: registry.txHash ?? "",
    token: params.token,
    value: params.amount,
    to: params.to,
    moveCid: params.moveCid,
  };
}
