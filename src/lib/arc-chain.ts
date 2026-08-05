import { defineChain } from "viem";

// CRITICAL: nativeCurrency.decimals = 6 because USDC is the gas token on Arc.
// Using 18 (the default EVM assumption) will corrupt every balance/fee display by 10^12.
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: {
      // Same-origin proxy: keeps the upstream provider key (Alchemy) server-side.
      http: ["/api/public/arc-rpc"],
    },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
});
