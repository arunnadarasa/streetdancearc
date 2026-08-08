// Server-only reader for Move Rights marketplace activity on Arc Testnet.
//
// Four things can happen to a move: it gets listed, the listing gets
// cancelled, someone buys it, or the owner hands it to another wallet.
// Three of those are MoveMarket events; the fourth is a plain ERC-721
// Transfer.
//
// Primary source is Arcscan (Blockscout), which indexes the full history —
// the raw RPC caps log queries at a few tens of thousands of blocks, far
// short of the collection's first mint. If the explorer is unreachable we
// fall back to a chunked RPC sweep over the recent window.

import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { TOKENS, type TokenKey } from "@/lib/tokens";
import market from "@/data/move-market.json";
import nft from "@/data/move-nft.json";

const ZERO = "0x0000000000000000000000000000000000000000";

const MARKET_ADDRESS = market.address as Address;
const NFT_ADDRESS = nft.address as Address;
const EXPLORER = nft.explorer.replace(/\/+$/, "");

const LISTED = parseAbiItem(
  "event Listed(uint256 indexed tokenId, address indexed seller, address payToken, uint256 price)",
);
const CANCELLED = parseAbiItem("event Cancelled(uint256 indexed tokenId, address indexed seller)");
const SOLD = parseAbiItem(
  "event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, address payToken, uint256 price)",
);
const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

const TOKEN_URI_ABI = [
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

export type ActivityKind = "listed" | "sold" | "cancelled" | "transfer" | "mint";

export interface MarketActivityEvent {
  id: string;
  kind: ActivityKind;
  label: string;
  tokenId: string;
  /** Wallet that initiated or owned the move: seller, sender, or minter. */
  from: string | null;
  /** Counterparty: buyer or recipient. Null for list/cancel. */
  to: string | null;
  priceAtomic: string | null;
  price: string | null;
  tokenKey: TokenKey | null;
  symbol: string | null;
  payToken: string | null;
  cid: string | null;
  cidUrl: string | null;
  txHash: string;
  blockNumber: string;
  logIndex: number;
  atSeconds: number;
  status: "success" | "failed" | "unknown";
  explorerUrl: string;
  tokenUrl: string;
}

export interface MarketActivity {
  events: MarketActivityEvent[];
  market: string;
  nft: string;
  configured: boolean;
  source: "explorer" | "rpc" | "none";
  degraded: boolean;
  detail: string | null;
  scannedBlocks: number;
}

function logsRpcUrl() {
  return process.env["ARC_LOGS_RPC_URL"] || "https://rpc.testnet.arc.network";
}

function pub() {
  return createPublicClient({ chain: arcTestnet, transport: http(logsRpcUrl()) });
}

export function activityConfigured(): boolean {
  return Boolean(market.address) && market.address.toLowerCase() !== ZERO;
}

function tokenKeyFor(address: string): TokenKey | null {
  const lower = address.toLowerCase();
  return (
    (Object.keys(TOKENS) as TokenKey[]).find((k) => TOKENS[k].address.toLowerCase() === lower) ?? null
  );
}

function formatUnits(atomic: bigint, decimals: number): string {
  const s = atomic.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

function priceFields(payToken: string, atomic: bigint) {
  const key = tokenKeyFor(payToken);
  const decimals = key ? TOKENS[key].decimals : 6;
  return {
    priceAtomic: atomic.toString(),
    price: formatUnits(atomic, decimals),
    tokenKey: key,
    symbol: key ? TOKENS[key].symbol : "token",
    payToken,
  };
}

function cidFromUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return uri.slice("ipfs://".length);
  const m = uri.match(/\/ipfs\/([^/?#]+.*)$/);
  return m?.[1] ?? null;
}

function gatewayFor(cid: string): string {
  const raw = process.env["PINATA_GATEWAY"];
  const base = raw
    ? `https://${raw.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/ipfs`
    : "https://gateway.pinata.cloud/ipfs";
  return `${base}/${cid}`;
}

function secondsFrom(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor(t / 1000) : 0;
}

function urls(tokenId: string, txHash: string) {
  return {
    explorerUrl: `${EXPLORER}/tx/${txHash}`,
    tokenUrl: `${EXPLORER}/token/${NFT_ADDRESS}/instance/${tokenId}`,
  };
}

const EMPTY_PRICE = {
  priceAtomic: null,
  price: null,
  tokenKey: null,
  symbol: null,
  payToken: null,
} as const;

function errText(e: unknown) {
  return (e instanceof Error ? e.message : String(e)).toLowerCase();
}
const isRange = (e: unknown) =>
  ["block range", "range too large", "too many", "exceed"].some((s) => errText(e).includes(s));
const isRateLimited = (e: unknown) =>
  ["rate limit", "429", "too many requests"].some((s) => errText(e).includes(s));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function humanReason(e: unknown): string {
  if (isRateLimited(e)) return "The Arc RPC is rate-limiting history reads right now.";
  if (isRange(e)) return "The RPC provider limits how far back log queries can reach.";
  return "Marketplace history could not be read right now.";
}

let cache: { at: number; value: MarketActivity } | null = null;
const CACHE_TTL_MS = 45_000;

const MIN_WINDOW = 500n;
const MAX_CALLS = 12;
const MAX_RECEIPT_LOOKUPS = 24;
const MAX_URI_LOOKUPS = 12;

// ---------------------------------------------------------------- explorer

interface DecodedParam {
  name: string;
  value: unknown;
}
interface ExplorerLog {
  block_number?: number;
  block_timestamp?: string;
  index?: number;
  transaction_hash?: string;
  decoded?: { method_call?: string; parameters?: DecodedParam[] } | null;
}
interface ExplorerTransfer {
  block_number?: number;
  timestamp?: string;
  log_index?: number;
  method?: string | null;
  transaction_hash?: string;
  from?: { hash?: string };
  to?: { hash?: string };
  total?: { token_id?: string };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function paramOf(log: ExplorerLog, name: string): string | null {
  const hit = log.decoded?.parameters?.find((p) => p.name === name);
  return hit ? String(hit.value ?? "") : null;
}

/** Read the whole indexed history from Arcscan. Returns null if unavailable. */
async function readViaExplorer(): Promise<MarketActivityEvent[] | null> {
  const [marketLogs, transfers, nftLogs] = await Promise.all([
    getJson<{ items?: ExplorerLog[] }>(`${EXPLORER}/api/v2/addresses/${MARKET_ADDRESS}/logs`),
    getJson<{ items?: ExplorerTransfer[] }>(`${EXPLORER}/api/v2/tokens/${NFT_ADDRESS}/transfers`),
    getJson<{ items?: ExplorerLog[] }>(`${EXPLORER}/api/v2/addresses/${NFT_ADDRESS}/logs`),
  ]);

  if (!marketLogs && !transfers) return null;

  // TokensMinted carries the metadata URI, so no extra RPC call is needed.
  const uriByToken = new Map<string, string>();
  for (const log of nftLogs?.items ?? []) {
    if (!log.decoded?.method_call?.startsWith("TokensMinted")) continue;
    const id = paramOf(log, "tokenIdMinted");
    const uri = paramOf(log, "uri");
    if (id && uri) uriByToken.set(id, uri);
  }

  const events: MarketActivityEvent[] = [];
  const soldKeys = new Set<string>();

  for (const log of marketLogs?.items ?? []) {
    const call = log.decoded?.method_call ?? "";
    const txHash = log.transaction_hash ?? "";
    const tokenId = paramOf(log, "tokenId") ?? "";
    const seller = paramOf(log, "seller");
    const common = {
      id: `${txHash}:${log.index ?? 0}`,
      tokenId,
      cid: null,
      cidUrl: null,
      txHash,
      blockNumber: String(log.block_number ?? 0),
      logIndex: Number(log.index ?? 0),
      atSeconds: secondsFrom(log.block_timestamp),
      status: "success" as const,
      ...urls(tokenId, txHash),
    };

    if (call.startsWith("Sold")) {
      soldKeys.add(`${txHash}:${tokenId}`);
      events.push({
        ...common,
        kind: "sold",
        label: "Sold",
        from: seller,
        to: paramOf(log, "buyer"),
        ...priceFields(paramOf(log, "payToken") ?? "", BigInt(paramOf(log, "price") ?? "0")),
      });
    } else if (call.startsWith("Listed")) {
      events.push({
        ...common,
        kind: "listed",
        label: "Listed",
        from: seller,
        to: null,
        ...priceFields(paramOf(log, "payToken") ?? "", BigInt(paramOf(log, "price") ?? "0")),
      });
    } else if (call.startsWith("Cancelled")) {
      events.push({
        ...common,
        kind: "cancelled",
        label: "Listing cancelled",
        from: seller,
        to: null,
        ...EMPTY_PRICE,
      });
    }
  }

  for (const t of transfers?.items ?? []) {
    const tokenId = t.total?.token_id ?? "";
    const txHash = t.transaction_hash ?? "";
    // The settlement leg of a purchase is already covered by the Sold row.
    if (soldKeys.has(`${txHash}:${tokenId}`)) continue;
    const from = t.from?.hash ?? "";
    const to = t.to?.hash ?? "";
    const isMint = from.toLowerCase() === ZERO;
    events.push({
      id: `${txHash}:${t.log_index ?? 0}`,
      kind: isMint ? "mint" : "transfer",
      label: isMint ? "Minted" : "Transferred",
      tokenId,
      from: isMint ? null : from,
      to,
      ...EMPTY_PRICE,
      cid: null,
      cidUrl: null,
      txHash,
      blockNumber: String(t.block_number ?? 0),
      logIndex: Number(t.log_index ?? 0),
      atSeconds: secondsFrom(t.timestamp),
      status: "success",
      ...urls(tokenId, txHash),
    });
  }

  for (const e of events) {
    const uri = uriByToken.get(e.tokenId);
    const cid = uri ? cidFromUri(uri) : null;
    if (cid) {
      e.cid = cid;
      e.cidUrl = gatewayFor(cid);
    }
  }

  return events;
}

// --------------------------------------------------------------------- rpc

interface RawLog {
  transactionHash?: string | null;
  blockNumber?: bigint | null;
  logIndex?: number | null;
  args: Record<string, unknown>;
}

/**
 * Sweep both contracts in chunked windows, newest blocks first. Shrinks the
 * window on provider range limits and backs off on 429s. Never throws.
 */
async function sweep(
  client: ReturnType<typeof pub>,
  head: bigint,
  lookback: bigint,
): Promise<{ market: RawLog[]; nft: RawLog[]; read: boolean; error: unknown; floor: bigint }> {
  const floor = head > lookback ? head - lookback : 0n;
  const deadline = Date.now() + 9_000;
  const marketLogs: RawLog[] = [];
  const nftLogs: RawLog[] = [];
  let window = 2_000n;
  let cursor = head;
  let calls = 0;
  let read = false;
  let error: unknown = null;

  while (cursor > floor && Date.now() < deadline && calls < MAX_CALLS) {
    const from = cursor - window + 1n > floor ? cursor - window + 1n : floor;
    calls += 1;
    try {
      const [m, n] = await Promise.all([
        client.getLogs({
          address: MARKET_ADDRESS,
          events: [LISTED, CANCELLED, SOLD],
          fromBlock: from,
          toBlock: cursor,
        }),
        client.getLogs({
          address: NFT_ADDRESS,
          event: TRANSFER,
          fromBlock: from,
          toBlock: cursor,
        }),
      ]);
      marketLogs.push(...(m as unknown as RawLog[]));
      nftLogs.push(...(n as unknown as RawLog[]));
      read = true;
      cursor = from - 1n;
    } catch (e) {
      error = e;
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

  return { market: marketLogs, nft: nftLogs, read, error, floor };
}

async function readViaRpc(lookback: bigint): Promise<{
  events: MarketActivityEvent[];
  read: boolean;
  error: unknown;
  scannedBlocks: number;
}> {
  const client = pub();
  let head: bigint;
  try {
    head = await client.getBlockNumber();
  } catch (e) {
    return { events: [], read: false, error: e, scannedBlocks: 0 };
  }

  const swept = await sweep(client, head, lookback);

  const mk = (log: RawLog, tokenId: string) => {
    const txHash = log.transactionHash ?? "";
    return {
      id: `${txHash}:${Number(log.logIndex ?? 0)}`,
      tokenId,
      cid: null,
      cidUrl: null,
      txHash,
      blockNumber: (log.blockNumber ?? 0n).toString(),
      logIndex: Number(log.logIndex ?? 0),
      atSeconds: 0,
      status: "unknown" as const,
      ...urls(tokenId, txHash),
    };
  };

  const events: MarketActivityEvent[] = [];
  const soldKeys = new Set<string>();

  for (const log of swept.market) {
    const tokenId = String(log.args["tokenId"] ?? "");
    const seller = (log.args["seller"] as string | undefined) ?? null;

    if (log.args["buyer"] !== undefined) {
      soldKeys.add(`${log.transactionHash ?? ""}:${tokenId}`);
      events.push({
        ...mk(log, tokenId),
        kind: "sold",
        label: "Sold",
        from: seller,
        to: (log.args["buyer"] as string) ?? null,
        ...priceFields(String(log.args["payToken"] ?? ""), (log.args["price"] as bigint) ?? 0n),
      });
    } else if (log.args["payToken"] !== undefined) {
      events.push({
        ...mk(log, tokenId),
        kind: "listed",
        label: "Listed",
        from: seller,
        to: null,
        ...priceFields(String(log.args["payToken"] ?? ""), (log.args["price"] as bigint) ?? 0n),
      });
    } else {
      events.push({
        ...mk(log, tokenId),
        kind: "cancelled",
        label: "Listing cancelled",
        from: seller,
        to: null,
        ...EMPTY_PRICE,
      });
    }
  }

  for (const log of swept.nft) {
    const tokenId = String(log.args["tokenId"] ?? "");
    const from = String(log.args["from"] ?? "");
    if (soldKeys.has(`${log.transactionHash ?? ""}:${tokenId}`)) continue;
    const isMint = from.toLowerCase() === ZERO;
    events.push({
      ...mk(log, tokenId),
      kind: isMint ? "mint" : "transfer",
      label: isMint ? "Minted" : "Transferred",
      from: isMint ? null : from,
      to: String(log.args["to"] ?? ""),
      ...EMPTY_PRICE,
    });
  }

  events.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber) || b.logIndex - a.logIndex);
  const trimmed = events.slice(0, Math.max(MAX_RECEIPT_LOOKUPS, 30));

  // Resolve each distinct move's metadata CID once, newest tokens first.
  const uniqueTokens: string[] = [];
  for (const e of trimmed) {
    if (e.tokenId && !uniqueTokens.includes(e.tokenId)) uniqueTokens.push(e.tokenId);
    if (uniqueTokens.length >= MAX_URI_LOOKUPS) break;
  }
  const cidByToken = new Map<string, string>();
  await Promise.all(
    uniqueTokens.map(async (tokenId) => {
      try {
        const uri = (await client.readContract({
          address: NFT_ADDRESS,
          abi: TOKEN_URI_ABI,
          functionName: "tokenURI",
          args: [BigInt(tokenId)],
        })) as string;
        const cid = cidFromUri(uri);
        if (cid) cidByToken.set(tokenId, cid);
      } catch {
        /* metadata unreadable — the row still renders without a CID */
      }
    }),
  );

  // Status for the newest rows only — one receipt call per distinct tx.
  const seenTx = new Map<string, "success" | "failed" | "unknown">();
  await Promise.all(
    trimmed.slice(0, MAX_RECEIPT_LOOKUPS).map(async (e) => {
      if (!e.txHash || seenTx.has(e.txHash)) return;
      seenTx.set(e.txHash, "unknown");
      try {
        const receipt = await client.getTransactionReceipt({ hash: e.txHash as `0x${string}` });
        seenTx.set(e.txHash, receipt.status === "success" ? "success" : "failed");
      } catch {
        /* a log exists, so the tx landed; leave it unknown */
      }
    }),
  );

  for (const e of trimmed) {
    const cid = cidByToken.get(e.tokenId);
    if (cid) {
      e.cid = cid;
      e.cidUrl = gatewayFor(cid);
    }
    e.status = seenTx.get(e.txHash) ?? "unknown";
  }

  return {
    events: trimmed,
    read: swept.read,
    error: swept.error,
    scannedBlocks: Number(head - swept.floor),
  };
}

// ------------------------------------------------------------------ public

/** Read recent marketplace + transfer activity. Never throws. */
export async function readMarketActivity(limit = 30, lookback = 5_000n): Promise<MarketActivity> {
  const base = { market: MARKET_ADDRESS, nft: NFT_ADDRESS, configured: activityConfigured() };

  if (!activityConfigured()) {
    return {
      ...base,
      events: [],
      source: "none",
      degraded: false,
      detail: "The marketplace contract is not deployed yet.",
      scannedBlocks: 0,
    };
  }

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.value, events: cache.value.events.slice(0, limit) };
  }

  const indexed = await readViaExplorer();
  if (indexed) {
    indexed.sort(
      (a, b) =>
        Number(b.blockNumber) - Number(a.blockNumber) ||
        b.logIndex - a.logIndex ||
        b.atSeconds - a.atSeconds,
    );
    const value: MarketActivity = {
      ...base,
      events: indexed,
      source: "explorer",
      degraded: false,
      detail: null,
      scannedBlocks: 0,
    };
    cache = { at: Date.now(), value };
    return { ...value, events: value.events.slice(0, limit) };
  }

  const fallback = await readViaRpc(lookback);
  const empty = fallback.events.length === 0;
  const value: MarketActivity = {
    ...base,
    events: fallback.events,
    source: "rpc",
    degraded: !fallback.read && empty,
    detail: !fallback.read && empty ? humanReason(fallback.error) : null,
    scannedBlocks: fallback.scannedBlocks,
  };
  if (fallback.read) cache = { at: Date.now(), value };
  return { ...value, events: value.events.slice(0, limit) };
}
