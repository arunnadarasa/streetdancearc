import { createFileRoute } from "@tanstack/react-router";
import { PrivyRoot } from "@/components/PrivyRoot";
import { AgentNegotiation } from "@/components/gx/AgentNegotiation";
import { Header } from "@/components/dance/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/agent-negotiation")({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { title: "Agent Negotiation · StreetRail" },
      { name: "description", content: "AIsa-powered buyer and seller agents negotiate a streetwear deal and settle on Arc Testnet." },
      { property: "og:title", content: "Agent Negotiation · StreetRail" },
      { property: "og:description", content: "AIsa-powered buyer and seller agents negotiate a streetwear deal and settle on Arc Testnet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { privyAppId } = Route.useLoaderData();
  return (
    <PrivyRoot appId={privyAppId}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <AgentNegotiation />
        <SiteFooter />
      </div>
    </PrivyRoot>
  );
}
