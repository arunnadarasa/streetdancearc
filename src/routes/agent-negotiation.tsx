import { createFileRoute } from "@tanstack/react-router";
import { PrivyRoot } from "@/components/PrivyRoot";
import { AgentNegotiation } from "@/components/gx/AgentNegotiation";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/agent-negotiation")({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { title: "Agent Negotiation · Dance Move Tokens" },
      { name: "description", content: "AIsa-powered buyer and seller agents negotiate a streetwear deal and settle on Arc Testnet." },
      { property: "og:title", content: "Agent Negotiation · Dance Move Tokens" },
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
      <AgentNegotiation />
    </PrivyRoot>
  );
}
