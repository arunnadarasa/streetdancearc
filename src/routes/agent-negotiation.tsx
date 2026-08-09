import { createFileRoute } from "@tanstack/react-router";
import { AgentNegotiation } from "@/components/gx/AgentNegotiation";
import { Header } from "@/components/dance/Header";
import { ModeSurface } from "@/components/gx/ModeSurface";
import { useGxMode } from "@/lib/gx-mode";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/agent-negotiation")({
  head: () => ({
    meta: [
      { title: "Agent Negotiation · StreetRail" },
      { name: "description", content: "AIsa-powered buyer and seller agents negotiate a streetwear deal and settle on Midnight Undeployed." },
      { property: "og:title", content: "Agent Negotiation · StreetRail" },
      { property: "og:description", content: "AIsa-powered buyer and seller agents negotiate a streetwear deal and settle on Midnight Undeployed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [mode] = useGxMode();
  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <ModeSurface mode={mode} agent={<AgentNegotiation />}>
          <AgentNegotiation />
        </ModeSurface>
        <SiteFooter />
      </div>
    </>
  );
}
