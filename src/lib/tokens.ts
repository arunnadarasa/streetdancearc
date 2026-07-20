// src/lib/tokens.ts - the three stablecoins every Creative Blockchain app must support
export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC_URL  = import.meta.env.VITE_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
export const ARC_EXPLORER = "https://testnet.arcscan.app";

export const TOKENS = {
  USDC:   { symbol: "USDC",   address: "0x3600000000000000000000000000000000000000", decimals: 6, label: "US Dollar (native gas)" },
  EURC:   { symbol: "EURC",   address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6, label: "Euro Coin" },
  cirBTC: { symbol: "cirBTC", address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8, label: "Circle Wrapped BTC" },
} as const;
export type TokenKey = keyof typeof TOKENS;
