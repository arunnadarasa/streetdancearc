import { createFileRoute } from "@tanstack/react-router";
import { PrivyRoot } from "@/components/PrivyRoot";
import { Header } from "@/components/dance/Header";
import { Section, SectionHead } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MoveMarketPanel } from "@/components/market/MoveMarketPanel";
import { MarketActivityPanel } from "@/components/market/MarketActivityPanel";

import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/market")({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { title: "Move Rights Market — Buy & Sell Choreography NFTs on Arc" },
      {
        name: "description",
        content:
          "List, buy and transfer StreetRail Move Rights NFTs on Circle's Arc Testnet, settled in USDC, EURC or cirBTC with gas paid in USDC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Move Rights Market — Buy & Sell Choreography NFTs on Arc" },
      {
        property: "og:description",
        content: "A non-custodial marketplace for dance move rights, settled in Arc stablecoins.",
      },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const { privyAppId } = Route.useLoaderData();

  return (
    <PrivyRoot appId={privyAppId}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <Section tone="base" lines>
          <SectionHead
            eyebrow="Secondary market"
            title="Trade move rights"
            blurb="Every Move Rights NFT can be listed, bought and transferred on Arc. Sellers keep custody until someone pays; settlement runs in USDC, EURC or cirBTC."
          />
          <div className="mt-8">
            <MoveMarketPanel />
          </div>
          <div className="mt-6">
            <MarketActivityPanel />
          </div>

        </Section>
        <SiteFooter />
      </div>
    </PrivyRoot>
  );
}
