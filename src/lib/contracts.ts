import { ARC_EXPLORER } from "@/lib/tokens";
import registry from "@/data/contract.json";
import authorizer from "@/data/street-rail-authorizer.json";
import moveNft from "@/data/move-nft.json";
import moveMarket from "@/data/move-market.json";

export type DeployedContract = {
  key: string;
  name: string;
  blurb: string;
  address: string;
  standards: string[];
  verified: boolean;
  explorerUrl: string;
};

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
    address,
    standards,
    verified: true,
    explorerUrl: `${ARC_EXPLORER}/address/${address}`,
  };
}

/** Every StreetRail contract deployed on Arc Testnet (chain 5042002). */
export const CONTRACTS: DeployedContract[] = [
  entry(
    "registry",
    "DanceMoveTokens",
    "Move registry and on-chain receipts for claims and settlements.",
    (registry as { address: string }).address,
    ["Registry", "Receipts"],
  ),
  entry(
    "authorizer",
    "StreetRailAuthorizer",
    "Smart-contract signatures so the treasury and agents authorize without an EOA delegate.",
    (authorizer as { address: string }).address,
    ["ERC-1271"],
  ),
  entry(
    "moveNft",
    "Move Rights NFT (MOVE)",
    "Ownership of a logged move, with royalties attached to every resale.",
    (moveNft as { address: string }).address,
    ["ERC-721", "ERC-2981"],
  ),
  entry(
    "market",
    "MoveMarket v2",
    "Listings, buys and transfers with the royalty split settled atomically.",
    (moveMarket as { address: string }).address,
    ["Marketplace", "Royalties"],
  ),
];

export const ARC_CHAIN_CAPTION = "Arc Testnet · chain 5042002 · USDC is gas";

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
