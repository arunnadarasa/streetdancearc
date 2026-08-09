import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCircleRails } from "@/lib/circle-rails.functions";
import { getAuthorizer } from "@/lib/erc1271.functions";

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <li className="rounded-xl border border-border/70 bg-background/40 px-4 py-3 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-black tracking-wide text-foreground">{label}</span>
        <span className="text-[11px] font-semibold text-glow">{value}</span>
      </div>
      {hint ? <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </li>
  );
}

/**
 * The Circle product rails powering StreetRail's agent flows:
 * Wallets + Contracts (already shipped), Nanopayments, App Kits and Gas Station.
 */
export function CircleRailsPanel() {
  const fetchRails = useServerFn(getCircleRails);
  const fetchAuthorizer = useServerFn(getAuthorizer);
  const { data: auth } = useQuery({
    queryKey: ["erc1271-authorizer"],
    queryFn: () => fetchAuthorizer(),
    staleTime: 5 * 60 * 1000,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["circle-rails"],
    queryFn: () => fetchRails(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="rounded-3xl border border-border/70 bg-surface/60 p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-foreground">Circle rails</h3>
        <span className="text-[11px] text-muted-foreground">
          Wallets · Contracts · Nanopayments · App Kits · Gas Station
        </span>
      </header>

      {isLoading || !data ? (
        <p className="mt-4 text-xs text-muted-foreground">Reading Circle rails…</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <Row
            label="ERC-1271 authorization"
            value={auth ? (auth.reachable ? "live" : "off-chain only") : "checking…"}
            hint={
              auth
                ? `Contract wallet ${auth.authorizer.slice(0, 10)}… authorizes Gateway actions with no EOA delegate — digests are pre-approved by the treasury and verified via isValidSignature.`
                : "Reading the on-chain authorizer…"
            }
          />
          <Row
            label="Nanopayments"
            value={data.nanopay.available ? "batched" : "fallback"}
            hint={
              data.nanopay.available
                ? `Gateway balance ${data.nanopay.gatewayUsdc} USDC · agent ${data.nanopay.agentAddress?.slice(0, 8)}…`
                : "Gateway batching unfunded — settlement falls back to Midnight mUSDC (x402 facilitator)."
            }
          />
          <Row
            label="Agent Stack discovery"
            value={`${data.discovery.total} resources`}
            hint={
              data.discovery.source === "circle"
                ? `Circle Agent Marketplace · ${data.discovery.arcCount} resources (demo settles on Midnight)`
                : "Marketplace unreachable — using StreetRail's own x402 / Midnight mUSDC resource."
            }
          />
          <Row
            label="App Kit · Unified Balance"
            value={data.balance.available ? `${data.balance.totalUsdc} USDC` : "treasury"}
            hint={
              data.balance.address
                ? `Treasury ${data.balance.address.slice(0, 10)}… — USDC only; EURC and cirBTC settle on the Swap surface.`
                : "No treasury address configured."
            }
          />
          <Row
            label="App Kit · Swap rates"
            value={data.rates.source === "circle-swap-kit" ? "Circle" : "live FX"}
            hint={data.rates.rates.map((r) => `${r.token} $${r.usd.toFixed(4)}`).join(" · ")}
          />
          <Row
            label="Gas Station"
            value={data.gasStation.enabled ? "sponsoring" : "not attached"}
            hint={data.gasStation.note}
          />
          <Row
            label="Paymaster"
            value="intentionally unused"
            hint="StreetRail settles experimental mUSDC on Midnight Undeployed — Circle Gas Station / paymaster are not used for that rail."
          />
        </ul>
      )}
    </section>
  );
}
