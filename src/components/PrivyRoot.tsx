import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly } from "./ClientOnly";

const PrivyClientEntry = lazy(
  () =>
    import("./privy-client-entry").catch((err) => {
      console.error("Failed to load Privy client entry; retrying once.", err);
      return import("./privy-client-entry");
    })
);

export function PrivyRoot({ children, appId }: { children: ReactNode; appId?: string }) {
  return (
    <ClientOnly fallback={children}>
      <Suspense fallback={children}>
        <PrivyClientEntry appId={appId}>{children}</PrivyClientEntry>
      </Suspense>
    </ClientOnly>
  );
}

