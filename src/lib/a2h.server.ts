// Server-only A2H payout engine.
//
// The Rights Agent pushes real value from the Circle treasury wallet to the
// choreographer's wallet and anchors every payout in the DanceMoveTokens
// registry via log(token, amount, cid). The inbox is then read back from those
// on-chain Logged events — nothing here is a fixture.

import fs from "node:fs";
import path from "node:path";
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

/** Short, human reason. Raw JSON-RPC text never reaches the UI. */
function humanReason(e: unknown): string {
  if (isRateLimited(e)) return "The public Arc RPC is rate-limiting history reads right now.";
  if (isRangeError(e)) return "The RPC provider limits how far back log queries can reach.";
  return "Registry history could not be read from the RPC provider.";
}

/** Last good log set, so repeat loads don't re-trigger rate limits. */
let logCache: { at: number; logs: RegistryLog[] } | null = null;
const CACHE_TTL_MS = 60_000;

const MIN_WINDOW = 500n;
const MAX_CALLS = 12;

/**
 * Read the registry's Logged events, newest first, optionally filtered by
 * recipient.
 *
 * The public Arc RPC rate-limits bursts and some providers cap the range, so we
 * page backwards over a short recent window with a hard call budget and give up
 * early rather than grinding through 429s. Never throws.
 */
const MIDNIGHT_A2H =
  "Indexer history is empty — new Undeployed mUSDC / MoveRegistry settlements still appear here when they land.";

export async function readPayouts(to?: string, lookback = 5_000n): Promise<PayoutHistory> {
  const wanted = to?.toLowerCase();

  // Soft-align: do not call Arc RPC after Midnight pivot unless explicitly configured.
  if (!process.env["ARC_RPC_URL"] && !process.env["ARC_LOGS_RPC_URL"]) {
    const payouts = mergeSession([], wanted);
    return {
      payouts,
      degraded: true,
      detail: MIDNIGHT_A2H,
    };
  }

  if (logCache && Date.now() - logCache.at < CACHE_TTL_MS) {
    return { payouts: mergeSession(mapLogs(logCache.logs, wanted), wanted), degraded: false, detail: null };
  }

  const pub = logsClient();

  let head: bigint;
  try {
    head = await pub.getBlockNumber();
  } catch (e) {
    const payouts = mergeSession([], wanted);
    return {
      payouts,
      degraded: payouts.length === 0,
      detail: payouts.length === 0 ? humanReason(e) : null,
    };
  }

  const floor = head > lookback ? head - lookback : 0n;
  const deadline = Date.now() + 8_000;
  const collected: RegistryLog[] = [];
  let window = 2_000n;
  let cursor = head;
  let lastError: unknown = null;
  let calls = 0;
  let read = false;

  while (cursor > floor && Date.now() < deadline && calls < MAX_CALLS) {
    const from = cursor - window + 1n > floor ? cursor - window + 1n : floor;
    calls += 1;
    try {
      const logs = (await pub.getLogs({
        address: REGISTRY,
        event: LOGGED,
        fromBlock: from,
        toBlock: cursor,
      })) as RegistryLog[];
      collected.push(...logs);
      read = true;
      cursor = from - 1n;
    } catch (e) {
      lastError = e;
      if (isRangeError(e) && window / 4n >= MIN_WINDOW) {
        window = window / 4n;
        continue;
      }
      if (isRateLimited(e)) {
        await sleep(400 + Math.floor(Math.random() * 400));
        continue;
      }
      break;
    }
  }

  if (read) logCache = { at: Date.now(), logs: collected };

  const payouts = mergeSession(mapLogs(collected, wanted), wanted);
  const degraded = !read && payouts.length === 0;
  return {
    payouts,
    degraded,
    detail: degraded ? humanReason(lastError) : null,
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

function moveRegistryAddress(): string {
  const env = process.env.VITE_DEFAULT_CONTRACT;
  if (env) return env;
  try {
    const p = path.resolve("src/data/midnight-contract.undeployed.json");
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, "utf8")) as {
        address?: string;
        contracts?: { moveRegistry?: { address?: string } };
      };
      return j.contracts?.moveRegistry?.address || j.address || "";
    }
  } catch {
    /* ignore */
  }
  return "";
}

/** Undeployed settle: experimental mUSDC transfer + Compact MoveRegistry append. */
async function sendPayoutMidnight(params: {
  to: string;
  token: TokenKey;
  amount: string;
  moveCid: string;
}): Promise<PayoutResult> {
  const { createHash } = await import("node:crypto");
  const { DEMO_SCALE } = await import("@/lib/agent-card");
  const { musdcTransfer, musdcFaucet } = await import("@/lib/musdc.server");
  const { appendEntry } = await import("@/lib/append-entry.server");

  const scaled = (Number(params.amount) * DEMO_SCALE).toFixed(6);
  const atomic = toAtomic(scaled, params.token);
  if (atomic <= 0n) throw new Error("payout_amount_zero");

  const toHex = createHash("sha256").update(`streetrail:a2h:${params.to}`).digest("hex");

  let transfer: Awaited<ReturnType<typeof musdcTransfer>>;
  try {
    transfer = await musdcTransfer({
      toHex,
      amountAtomic: atomic.toString(),
    });
  } catch (e1) {
    const msg1 = e1 instanceof Error ? e1.message : String(e1);
    if (/no balance|insufficient|SubmissionError|FiberFailure/i.test(msg1)) {
      await musdcFaucet().catch(() => {});
      transfer = await musdcTransfer({
        toHex,
        amountAtomic: atomic.toString(),
      });
    } else {
      throw e1;
    }
  }

  let registryTx = transfer.midnightTxHash;
  const registryAddr = moveRegistryAddress();
  if (registryAddr) {
    try {
      const anchored = await appendEntry({
        contractAddress: registryAddr,
        appTag: "streetrail_a2h_payout",
        message: encodeCid(params.moveCid, params.to),
        payload: {
          mode: "A2H",
          to: params.to,
          token: params.token,
          amount: scaled,
          settleTx: transfer.midnightTxHash,
        },
      });
      registryTx = anchored.txId;
    } catch {
      /* transfer still counts as the payout receipt */
    }
  }

  sessionPayouts.unshift({
    txHash: transfer.midnightTxHash,
    moveCid: params.moveCid,
    to: params.to.toLowerCase(),
    token: params.token,
    value: scaled,
    atSeconds: Math.floor(Date.now() / 1000),
    blockNumber: "0",
  });
  if (sessionPayouts.length > 50) sessionPayouts.length = 50;

  return {
    transferTx: transfer.midnightTxHash,
    registryTx,
    token: params.token,
    value: scaled,
    to: params.to,
    moveCid: params.moveCid,
  };
}

/**
 * Send a payout and anchor it.
 * Midnight Undeployed: mUSDC server-append + MoveRegistry appendEntry.
 * Legacy Arc path kept when CIRCLE_API_KEY is configured.
 */
export async function sendPayout(params: {
  to: string;
  token: TokenKey;
  amount: string;
  moveCid: string;
}): Promise<PayoutResult> {
  const undeployed = (process.env.VITE_NETWORK_ID ?? "undeployed") === "undeployed";
  if (undeployed || !process.env["CIRCLE_API_KEY"]) {
    return sendPayoutMidnight(params);
  }

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
