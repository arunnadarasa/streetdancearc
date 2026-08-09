// Live on-chain activity across StreetRail's four verified Arc contracts.
//
// Everything here is read-only and best-effort: any single source that fails
// is reported as `null` rather than throwing, so the landing page can fall
// back to its static copy instead of rendering an error.

import { createPublicClient, http, type Address } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { readReceipts } from "@/lib/receipts.server";
import registry from "@/data/contract.json";
import nft from "@/data/move-nft.json";
import market from "@/data/move-market.json";
import authorizer from "@/data/street-rail-authorizer.json";

const EXPLORER = "https://testnet.arcscan.app";

const ERC721_SUPPLY_ABI = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const MARKET_COUNT_ABI = [
  {
    type: "function",
    name: "activeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

function pub() {
  const url = process.env["ARC_LOGS_RPC_URL"] || "https://rpc.testnet.arc.network";
  return createPublicClient({ chain: arcTestnet, transport: http(url) });
}

export interface MetricItem {
  key: string;
  /** Formatted value, or null when the source could not be read. */
  value: string | null;
  label: string;
  href: string;
}

export interface OnChainMetrics {
  items: MetricItem[];
  /** True when at least one metric was read successfully. */
  live: boolean;
  scannedBlocks: number;
  contracts: { name: string; address: string; href: string }[];
}

let cache: { at: number; value: OnChainMetrics } | null = null;
const CACHE_TTL_MS = 60_000;

async function readTotalSupply(): Promise<number | null> {
  try {
    const v = (await pub().readContract({
      address: nft.address as Address,
      abi: ERC721_SUPPLY_ABI,
      functionName: "totalSupply",
    })) as bigint;
    return Number(v);
  } catch {
    return null;
  }
}

async function readActiveListings(): Promise<number | null> {
  try {
    const v = (await pub().readContract({
      address: market.address as Address,
      abi: MARKET_COUNT_ABI,
      functionName: "activeCount",
    })) as bigint;
    return Number(v);
  } catch {
    return null;
  }
}

function fmt(n: number | null): string | null {
  return n === null ? null : n.toLocaleString("en-US");
}

/** Aggregate live activity from the four contracts. Never throws. */
export async function readOnChainMetrics(): Promise<OnChainMetrics> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const [history, supply, listings] = await Promise.all([
    readReceipts(50).catch(() => null),
    readTotalSupply(),
    readActiveListings(),
  ]);

  const receipts = history && !history.degraded ? history.receipts : null;
  const settlements =
    receipts === null
      ? null
      : receipts.filter((r) => r.kind === "payout" || r.kind === "batch").length;
  const usdcSettled =
    receipts === null
      ? null
      : receipts
          .filter((r) => r.token === "USDC")
          .reduce((sum, r) => sum + Number(r.amount || "0"), 0);

  const items: MetricItem[] = [
    {
      key: "records",
      value: fmt(receipts === null ? null : receipts.length),
      label: "Registry records on Arc",
      href: `${EXPLORER}/address/${registry.address}`,
    },
    {
      key: "nfts",
      value: fmt(supply),
      label: "Move Rights NFTs minted",
      href: `${EXPLORER}/address/${nft.address}`,
    },
    {
      key: "settlements",
      value: fmt(settlements),
      label: "Agent settlements executed",
      href: `${EXPLORER}/address/${registry.address}`,
    },
    {
      key: "usdc",
      value: usdcSettled === null ? null : `${usdcSettled.toFixed(2)}`,
      label: "USDC settled through the rail",
      href: `${EXPLORER}/address/${registry.address}`,
    },
    {
      key: "listings",
      value: fmt(listings),
      label: "Active marketplace listings",
      href: `${EXPLORER}/address/${market.address}`,
    },
  ];

  const value: OnChainMetrics = {
    items,
    live: items.some((i) => i.value !== null),
    scannedBlocks: history?.scannedBlocks ?? 0,
    contracts: [
      { name: "Move registry", address: registry.address, href: `${EXPLORER}/address/${registry.address}` },
      { name: "Move Rights NFT", address: nft.address, href: `${EXPLORER}/address/${nft.address}` },
      { name: "Move marketplace", address: market.address, href: `${EXPLORER}/address/${market.address}` },
      {
        name: "ERC-1271 authorizer",
        address: authorizer.address,
        href: `${EXPLORER}/address/${authorizer.address}`,
      },
    ],
  };

  if (value.live) cache = { at: Date.now(), value };
  return value;
}
