import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { WalletContext, type WalletApi, type WalletLike } from "@/lib/wallet-context";
import { useMidnightWallet } from "@/lib/use-midnight-wallet";

/**
 * Lace / Undeployed wallet provider that satisfies the existing WalletApi shape
 * so shop/cart/agent panels keep working without Privy.
 */
export default function MidnightWalletEntry({ children }: { children: ReactNode }) {
  const w = useMidnightWallet();

  const api: WalletApi = useMemo(() => {
    const authenticated = w.status === "connected" && !!w.address;
    const walletLike: WalletLike = {
      address: w.unshieldedAddress || w.address || undefined,
      walletClientType: "lace",
      switchChain: async () => {},
      getEthereumProvider: async () => {
        throw new Error(
          "Ethereum provider unavailable on Midnight. Settlement uses /api/public/musdc-transfer.",
        );
      },
    };
    return {
      available: true,
      ready: w.status !== "idle" && w.status !== "detecting",
      authenticated,
      user: authenticated ? { wallet: { address: walletLike.address } } : null,
      wallets: authenticated ? [walletLike] : [],
      login: () => w.connect(),
      logout: () => w.disconnect(),
      network: w.network,
      unshieldedAddress: w.unshieldedAddress,
      dustBalance: w.dust?.balance ?? null,
    };
  }, [w]);

  // Bubble wallet state via effect only (avoid setState-during-render loops).
  useEffect(() => {
    /* reserved for future parent notifications */
  }, [w.status, w.address]);

  return <WalletContext.Provider value={api}>{children}</WalletContext.Provider>;
}
