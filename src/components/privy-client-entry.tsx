import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { arcTestnet } from "@/lib/arc-chain";

export default function PrivyClientEntry({ children, appId }: { children: ReactNode; appId?: string }) {
  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-8">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-[#1DB954]">Missing PRIVY_APP_ID</h1>
          <p className="text-sm text-neutral-400">
            Paste your Privy app ID in Project Settings → Secrets as
            <code className="mx-1 rounded bg-neutral-800 px-1">PRIVY_APP_ID</code>
            and reload.
          </p>
        </div>
      </div>
    );
  }
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: arcTestnet,
        supportedChains: [arcTestnet],
        appearance: {
          theme: "dark",
          accentColor: "#1DB954",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
