import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/dance/Header";
import { MoveRegistry } from "@/components/dance/MoveRegistry";
import { Section } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/moves")({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { title: "Marketplace for Moves — Midnight MoveRegistry" },
      {
        name: "description",
        content:
          "Register choreography on Compact MoveRegistry — prove, append the CID, verify via the local Midnight Undeployed indexer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Marketplace for Moves — Midnight MoveRegistry" },
      {
        property: "og:description",
        content:
          "License choreography as Compact MoveRegistry entries on Midnight Local Undeployed.",
      },
    ],
  }),
  component: MovesPage,
});

function MovesPage() {
  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <Section tone="base" lines>
          <MoveRegistry />
        </Section>
        <SiteFooter />
      </div>
    </>
  );
}
