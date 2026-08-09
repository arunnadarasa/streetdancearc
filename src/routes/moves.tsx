import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/dance/Header";
import { ModeSurface } from "@/components/gx/ModeSurface";
import { useGxMode } from "@/lib/gx-mode";
import { MoveRegistry } from "@/components/dance/MoveRegistry";
import { Section } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/moves")({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { title: "Marketplace for Moves — License Choreography On-Chain" },
      {
        name: "description",
        content:
          "Register, license and settle dance moves as on-chain rights records with IPFS metadata — paid in USDC, EURC or cirBTC on Circle's Arc Testnet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Marketplace for Moves — License Choreography On-Chain" },
      {
        property: "og:description",
        content:
          "License choreography as on-chain rights records, settled in stablecoins on Arc.",
      },
    ],
  }),
  component: MovesPage,
});

function MovesPage() {
  const { treasuryAddress } = Route.useLoaderData();
  const [mode] = useGxMode();

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <ModeSurface mode={mode}>
          <Section tone="base" lines>
            <MoveRegistry treasuryAddress={treasuryAddress} />
          </Section>
        </ModeSurface>
        <SiteFooter />
      </div>
    </>
  );
}
