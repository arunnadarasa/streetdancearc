import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly } from "./ClientOnly";

const PrivyClientEntry = lazy(() => import("./privy-client-entry"));

export function PrivyRoot({ children, appId }: { children: ReactNode; appId?: string }) {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <PrivyClientEntry appId={appId}>{children}</PrivyClientEntry>
      </Suspense>
    </ClientOnly>
  );
}
