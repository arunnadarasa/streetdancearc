import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly } from "./ClientOnly";

const PrivyClientEntry = lazy(() => import("./privy-client-entry"));

export function PrivyRoot({ children, appId }: { children: ReactNode; appId?: string }) {
  return (
    <ClientOnly fallback={children}>
      <Suspense fallback={children}>
        <PrivyClientEntry appId={appId}>{children}</PrivyClientEntry>
      </Suspense>
    </ClientOnly>
  );
}
