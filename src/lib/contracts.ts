import { INDEXER_URL } from "@/lib/tokens";
import midnight from "@/data/midnight-contract.json";

export type DeployedContract = {
  key: string;
  name: string;
  blurb: string;
  address: string;
  standards: string[];
  verified: boolean;
  explorerUrl: string;
};

type DeployFile = {
  address?: string;
  contracts?: Record<string, { name?: string; address?: string }>;
};

const deploy = midnight as DeployFile;

function entry(
  key: string,
  name: string,
  blurb: string,
  address: string,
  standards: string[],
): DeployedContract {
  return {
    key,
    name,
    blurb,
    address: address || "not-deployed",
    standards,
    verified: !!address && !/^0+$/.test(address.replace(/^0x/, "")),
    explorerUrl: `${INDEXER_URL}#contract=${encodeURIComponent(address || "")}`,
  };
}

export const ARC_CHAIN_CAPTION = "Midnight Local Undeployed · Compact contracts · indexer GraphQL";

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 1) return addr || "—";
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** StreetRail Compact contracts on Midnight Local Undeployed. */
export const CONTRACTS: DeployedContract[] = [
  entry(
    "registry",
    "MoveRegistry",
    "Compact move / choreography registry — appendEntry discloses CID + author commitment.",
    deploy.contracts?.moveRegistry?.address || deploy.address || "",
    ["Compact", "appendEntry"],
  ),
  entry(
    "mandate",
    "MandateVault",
    "AP2 CartMandate anchors with buyer public-key check (ap2:buyer:v1).",
    deploy.contracts?.mandateVault?.address || "",
    ["AP2", "anchorMandate"],
  ),
  entry(
    "orders",
    "OrderLedger",
    "UCP order recorder + merchant signing-key fingerprint.",
    deploy.contracts?.orderLedger?.address || "",
    ["UCP", "recordOrder"],
  ),
  entry(
    "musdc",
    "MidnightUSDC",
    "Experimental mUSDC mimic (faucet + transfer + spent nonces). No peg — never Mainnet.",
    deploy.contracts?.midnightUsdc?.address || "",
    ["mUSDC", "x402"],
  ),
  entry(
    "moveNft",
    "MoveNft",
    "Compact Move Rights NFT — mint, list, buy, transfer; mUSDC settle off-contract.",
    deploy.contracts?.moveNft?.address || "",
    ["Compact", "NFT", "mUSDC"],
  ),
];
