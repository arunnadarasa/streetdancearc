// Thin server-function wrapper for the live on-chain metrics strip.

import { createServerFn } from "@tanstack/react-start";

export const getOnChainMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const { readOnChainMetrics } = await import("@/lib/metrics.server");
  return readOnChainMetrics();
});
