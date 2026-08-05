import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { arcTestnet } from "@/lib/arc-chain";
import { WalletBridge } from "./wallet-bridge";
import { WalletContext, WALLET_UNAVAILABLE } from "@/lib/wallet-context";

/** Publishable Privy app ID — safe in the client bundle. */
const BUILD_TIME_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID as string | undefined) ?? "";

export default function PrivyClientEntry({ children, appId }: { children: ReactNode; appId?: string }) {
  const resolved = (appId && appId.trim()) || BUILD_TIME_APP_ID.trim();

  if (!resolved) {
    // Wallet features are unavailable, but the storefront still renders.
    return <WalletContext.Provider value={WALLET_UNAVAILABLE}>{children}</WalletContext.Provider>;
  }

  return (
    <PrivyProvider
      appId={resolved}
      config={{
        loginMethods: ["google"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
        appearance: {
          theme: "dark",
          accentColor: "#4f46e5",
        },
      }}
    >
      <WalletBridge>{children}</WalletBridge>
    </PrivyProvider>
  );
}
