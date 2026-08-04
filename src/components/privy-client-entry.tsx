import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { arcTestnet } from "@/lib/arc-chain";

export default function PrivyClientEntry({ children, appId }: { children: ReactNode; appId?: string }) {
  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-glow">Missing PRIVY_APP_ID</h1>
          <p className="text-sm text-muted-foreground">
            Paste your Privy app ID in Project Settings → Secrets as
            <code className="mx-1 rounded bg-secondary px-1">PRIVY_APP_ID</code>
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
          accentColor: "#4f46e5",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
