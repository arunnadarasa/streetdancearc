import type { ReactNode } from "react";
import { ClientOnly } from "./ClientOnly";
import MidnightWalletEntry from "./midnight-wallet-entry";
import { WalletContext, UNDEPLOYED_WALLET_BOOT } from "@/lib/wallet-context";

function UndeployedBoot({ children }: { children: ReactNode }) {
  return (
    <WalletContext.Provider value={UNDEPLOYED_WALLET_BOOT}>{children}</WalletContext.Provider>
  );
}

export function MidnightRoot({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={<UndeployedBoot>{children}</UndeployedBoot>}>
      <MidnightWalletEntry>{children}</MidnightWalletEntry>
    </ClientOnly>
  );
}
