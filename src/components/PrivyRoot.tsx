import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly } from "./ClientOnly";

const PrivyClientEntry = lazy(() => import("./privy-client-entry"));

export function PrivyRoot({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
        <PrivyClientEntry>{children}</PrivyClientEntry>
      </Suspense>
    </ClientOnly>
  );
}
