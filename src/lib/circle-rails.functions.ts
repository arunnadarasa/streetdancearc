import { createServerFn } from "@tanstack/react-start";

/** Circle rails snapshot: Nanopayments, App Kits, Gas Station, Agent Stack discovery. */
export const getCircleRails = createServerFn({ method: "GET" }).handler(async () => {
  const [{ nanopayStatus }, { discoverResources }, appkit, { getFxRates }] = await Promise.all([
    import("@/lib/nanopay.server"),
    import("@/lib/discovery.server"),
    import("@/lib/appkit.server"),
    import("@/lib/fx.server"),
  ]);

  const fx = await getFxRates().catch(() => null);
  const fxUsd = [
    { token: "USDC", usd: 1 },
    { token: "EURC", usd: Number(fx?.eurUsd ?? 1.08) },
  ];

  const [nanopay, discovery, balance, rates] = await Promise.all([
    nanopayStatus(),
    discoverResources(),
    appkit.unifiedBalance(),
    appkit.swapRates(fxUsd),
  ]);

  return { nanopay, discovery, balance, rates, gasStation: appkit.gasStationStatus() };
});

/** Try to settle an x402 resource through Circle Gateway batching. */
export const payWithNanopayments = createServerFn({ method: "POST" })
  .validator((data: { url: string; body?: unknown }) => ({
    url: String(data.url).slice(0, 300),
    body: data.body,
  }))
  .handler(async ({ data }) => {
    const { nanopaySupports, nanopay } = await import("@/lib/nanopay.server");
    const origin = process.env["PUBLIC_ORIGIN"] ?? "";
    const url = data.url.startsWith("http") ? data.url : `${origin}${data.url}`;
    const supports = await nanopaySupports(url);
    if (!supports.supported) {
      return { simulated: true, batched: false, reason: supports.reason ?? "resource_not_batching_capable" };
    }
    return nanopay(url, data.body);
  });
