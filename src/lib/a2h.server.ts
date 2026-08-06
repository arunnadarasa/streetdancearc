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
export const PAYOUT_UNIT_USD = 0.001;

/**
 * Nanopayments accrue off-chain until the open batch is worth this much, then
 * one transfer + one registry log settles the lot.
 */
export const BATCH_THRESHOLD_USD = 0.5;

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

function errText(e: unknown) {
  return (e instanceof Error ? e.message : String(e)).toLowerCase();
}

function isRangeError(e: unknown) {
  const msg = errText(e);
  return (
    msg.includes("block range") ||
    msg.includes("range too large") ||
    msg.includes("range should work") ||
    msg.includes("too many") ||
    msg.includes("exceed")
  );
}

function isRateLimited(e: unknown) {
  const msg = errText(e);
  return msg.includes("rate limit") || msg.includes("429") || msg.includes("too many requests");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
 * recipient.
 *
 * The public Arc RPC accepts ~20k-block eth_getLogs windows and rate-limits
 * bursts; Alchemy's free tier caps the range at 10 blocks. So we page backwards
 * in windows, shrinking on range errors and backing off on rate limits, under
 * an overall time budget. Never throws — degrades to whatever it managed to
 * read plus this instance's own settlements.
 */
export async function readPayouts(to?: string, lookback = 100_000n): Promise<PayoutHistory> {
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

  const floor = head > lookback ? head - lookback : 0n;
  const deadline = Date.now() + 9_000;
  const collected: RegistryLog[] = [];
  let window = 20_000n;
  let cursor = head;
  let lastError: string | null = null;
  let covered = 0n;

  while (cursor > floor && Date.now() < deadline) {
    const from = cursor - window + 1n > floor ? cursor - window + 1n : floor;
    try {
      const logs = (await pub.getLogs({
        address: REGISTRY,
        event: LOGGED,
        fromBlock: from,
        toBlock: cursor,
      })) as RegistryLog[];
      collected.push(...logs);
      covered += cursor - from + 1n;
      cursor = from - 1n;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "registry_read_failed";
      if (isRangeError(e) && window > 10n) {
        window = window / 4n > 10n ? window / 4n : 10n;
        continue;
      }
      if (isRateLimited(e)) {
        await sleep(600);
        continue;
      }
      break;
    }
  }

  const complete = cursor <= floor && covered > 0n;
  return {
    payouts: mergeSession(mapLogs(collected, wanted), wanted),
    degraded: !complete,
    detail: complete
      ? null
      : (lastError ??
        "The RPC provider limits log queries, so only recent registry history is shown."),
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
