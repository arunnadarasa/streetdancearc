// Server-only reader for the full DanceMoveTokens registry history.
//
// Every mode (H2H mint, H2A licence, A2A x402 batch, A2H payout/claim) ends in
// the same call: log(token, amount, cid). This module sweeps those Logged
// events, resolves each transaction's receipt status, and returns a flat,
// newest-first history for the UI.

import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { TOKENS, fromAtomic, type TokenKey } from "@/lib/tokens";
import contract from "@/data/contract.json";

const REGISTRY = contract.address as Address;

const LOGGED = parseAbiItem(
  "event Logged(address indexed author, address indexed token, uint256 amount, string cid, uint256 at)",
);

function logsRpcUrl() {
  return process.env["ARC_LOGS_RPC_URL"] || "https://rpc.testnet.arc.network";
}

function pub() {
  return createPublicClient({ chain: arcTestnet, transport: http(logsRpcUrl()) });
}

export type ReceiptKind = "payout" | "claim" | "batch" | "mint";

export interface RegistryReceipt {
  txHash: string;
  author: string;
  token: TokenKey;
  amount: string;
  cid: string;
  kind: ReceiptKind;
  label: string;
  atSeconds: number;
  blockNumber: string;
  status: "success" | "failed" | "unknown";
  explorerUrl: string;
}

export interface ReceiptHistory {
  receipts: RegistryReceipt[];
  registry: string;
  degraded: boolean;
  detail: string | null;
  scannedBlocks: number;
}

function tokenKeyForAddress(address: string): TokenKey {
  const lower = address.toLowerCase();
  const hit = (Object.keys(TOKENS) as TokenKey[]).find(
    (k) => TOKENS[k].address.toLowerCase() === lower,
  );
  return hit ?? "USDC";
}

function classify(cid: string): { kind: ReceiptKind; label: string } {
  if (cid.startsWith("a2h:")) return { kind: "payout", label: "A2H payout" };
  if (cid.startsWith("srclaim:")) return { kind: "claim", label: "Offer claim" };
  if (cid.startsWith("batch:") || cid.startsWith("nano:")) {
    return { kind: "batch", label: "Nanopayment batch" };
  }
  return { kind: "mint", label: "Move log" };
}

function errText(e: unknown) {
  return (e instanceof Error ? e.message : String(e)).toLowerCase();
}
const isRange = (e: unknown) =>
  ["block range", "range too large", "too many", "exceed"].some((s) => errText(e).includes(s));
const isRateLimited = (e: unknown) =>
  ["rate limit", "429", "too many requests"].some((s) => errText(e).includes(s));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function humanReason(e: unknown): string {
  if (isRateLimited(e)) return "The public Arc RPC is rate-limiting history reads right now.";
  if (isRange(e)) return "The RPC provider limits how far back log queries can reach.";
  return "Registry history could not be read from the RPC provider.";
}

let cache: { at: number; value: ReceiptHistory } | null = null;
const CACHE_TTL_MS = 45_000;

const MIN_WINDOW = 500n;
const MAX_CALLS = 12;
const MAX_RECEIPT_LOOKUPS = 24;

/** Read the registry's whole recent history. Never throws. */
export async function readReceipts(limit = 25, lookback = 5_000n): Promise<ReceiptHistory> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.value, receipts: cache.value.receipts.slice(0, limit) };
  }

  const client = pub();
  const explorer = contract.explorer;

  let head: bigint;
  try {
    head = await client.getBlockNumber();
  } catch (e) {
    return {
      receipts: [],
      registry: REGISTRY,
      degraded: true,
      detail: humanReason(e),
      scannedBlocks: 0,
    };
  }

  const floor = head > lookback ? head - lookback : 0n;
  const deadline = Date.now() + 8_000;
  const collected: Array<{
    transactionHash?: string | null;
    blockNumber?: bigint | null;
    args: { author?: unknown; token?: unknown; amount?: unknown; cid?: unknown; at?: unknown };
  }> = [];
  let window = 2_000n;
  let cursor = head;
  let calls = 0;
  let read = false;
  let lastError: unknown = null;

  while (cursor > floor && Date.now() < deadline && calls < MAX_CALLS) {
    const from = cursor - window + 1n > floor ? cursor - window + 1n : floor;
    calls += 1;
    try {
      const logs = await client.getLogs({
        address: REGISTRY,
        event: LOGGED,
        fromBlock: from,
        toBlock: cursor,
      });
      collected.push(...(logs as unknown as typeof collected));
      read = true;
      cursor = from - 1n;
    } catch (e) {
      lastError = e;
      if (isRange(e) && window / 4n >= MIN_WINDOW) {
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

  const mapped: RegistryReceipt[] = collected
    .map((log) => {
      const cid = String(log.args.cid ?? "");
      const token = tokenKeyForAddress(String(log.args.token ?? ""));
      const { kind, label } = classify(cid);
      const txHash = log.transactionHash ?? "";
      return {
        txHash,
        author: String(log.args.author ?? ""),
        token,
        amount: fromAtomic((log.args.amount as bigint | undefined) ?? 0n, token),
        cid,
        kind,
        label,
        atSeconds: Number((log.args.at as bigint | undefined) ?? 0n),
        blockNumber: (log.blockNumber ?? 0n).toString(),
        status: "unknown" as const,
        explorerUrl: `${explorer}/tx/${txHash}`,
      };
    })
    .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber) || b.atSeconds - a.atSeconds)
    .slice(0, Math.max(limit, MAX_RECEIPT_LOOKUPS));

  // Resolve receipt status for the newest entries only — one RPC call each.
  const heads = mapped.slice(0, MAX_RECEIPT_LOOKUPS);
  await Promise.all(
    heads.map(async (r) => {
      if (!r.txHash) return;
      try {
        const receipt = await client.getTransactionReceipt({ txHash: r.txHash as `0x${string}` });
        r.status = receipt.status === "success" ? "success" : "failed";
      } catch {
        // A log exists, so the tx landed; treat an unreadable receipt as unknown.
        r.status = "unknown";
      }
    }),
  );

  const value: ReceiptHistory = {
    receipts: mapped,
    registry: REGISTRY,
    degraded: !read && mapped.length === 0,
    detail: !read && mapped.length === 0 ? humanReason(lastError) : null,
    scannedBlocks: Number(head - floor),
  };

  if (read) cache = { at: Date.now(), value };
  return { ...value, receipts: value.receipts.slice(0, limit) };
}
