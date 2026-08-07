import { createServerFn } from "@tanstack/react-start";

/** Live x402 resource catalog from Circle's Agent Marketplace (keyless public API). */
export const fetchDiscovery = createServerFn({ method: "GET" }).handler(async () => {
  const { discoverResources, selectArcResource } = await import("@/lib/discovery.server");
  const result = await discoverResources();
  const selected = selectArcResource(result);
  return { ...result, selected: selected.resource };
});
