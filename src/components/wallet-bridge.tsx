import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useMemo, type ReactNode } from "react";
import { WalletContext, type WalletApi, type WalletLike } from "@/lib/wallet-context";

/**
 * Client-only bridge: exposes Privy state through WalletContext so app code
 * never calls Privy hooks directly (and keeps working when Privy is absent).
 */
export function WalletBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const value = useMemo<WalletApi>(
    () => ({
      available: true,
      ready,
      authenticated,
      user: (user as WalletApi["user"]) ?? null,
      wallets: wallets as unknown as WalletLike[],
      login,
      logout,
    }),
    [ready, authenticated, user, wallets, login, logout],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
