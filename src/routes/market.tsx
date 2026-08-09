import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Header } from "@/components/dance/Header";
import { Section, SectionHead } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MidnightMoveMarketPanel } from "@/components/market/MidnightMoveMarketPanel";
import { MarketActivityPanel } from "@/components/market/MarketActivityPanel";

const marketSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "all").default("all"),
  license: fallback(z.string(), "all").default("all"),
  tok: fallback(z.string(), "all").default("all"),
  sort: fallback(z.string(), "newest").default("newest"),
});

export const Route = createFileRoute("/market")({
  validateSearch: zodValidator(marketSearchSchema),
  head: () => ({
    meta: [
      { title: "Move Rights Market — Compact MoveNfts on Midnight" },
      {
        name: "description",
        content:
          "List, buy and transfer StreetRail Move Rights NFTs on Midnight Undeployed, settled in experimental mUSDC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Move Rights Market — Compact MoveNfts on Midnight" },
      {
        property: "og:description",
        content: "A Compact MoveNft marketplace for dance move rights, settled in mUSDC.",
      },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <Section tone="base" lines>
          <SectionHead
            eyebrow="Secondary market"
            title="Trade move rights"
            blurb="Compact MoveNfts on Midnight Undeployed. Mint on /moves, then list, buy or transfer here — settlement runs in experimental mUSDC."
          />
          <div className="mt-8">
            <MidnightMoveMarketPanel />
          </div>
          <div className="mt-6">
            <MarketActivityPanel />
          </div>
        </Section>
        <SiteFooter />
      </div>
    </>
  );
}
