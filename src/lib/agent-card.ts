// Shared A2A-style Agent Card for the StreetKode storefront agent.
// Imported by the public discovery route (server) and the GX UI (client).

export const AGENT_NAME = "streetkode-storefront";
export const DEMO_SCALE = 0.001; // testnet settles 1/1000 of the listed price

export const ARC_CAIP2 = "eip155:5042002";
export const USDC_ARC = "0x3600000000000000000000000000000000000000";
export const RIGHTS_REGISTRY = "0x4d13b45f823f8944522890c20d8695b6005465f0";

export interface AgentCard {
  protocolVersion: string;
  name: string;
  description: string;
  url: string;
  provider: { organization: string; url: string };
  version: string;
  capabilities: { streaming: boolean; pushNotifications: boolean; stateTransitionHistory: boolean };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
    endpoint: { method: string; path: string };
  }>;
  extensions: {
    payments: {
      protocol: string;
      schemes: string[];
      networks: string[];
      assets: Array<{ symbol: string; address: string; decimals: number; caip19: string }>;
      payTo: string;
      demoScale: number;
      gasToken: string;
    };
    rights: {
      registry: string;
      chain: string;
      explorer: string;
      description: string;
    };
  };
}

export function buildAgentCard(origin: string, payTo: string): AgentCard {
  return {
    protocolVersion: "0.3.0",
    name: AGENT_NAME,
    description:
      "Street dance streetwear storefront. Exposes the live catalog as typed offers and settles orders in USDC on Circle's Arc Testnet over an x402-style payment challenge. Every purchase can carry a pointer to the choreographer's on-chain move-rights record.",
    url: `${origin}/api/public/agent-card`,
    provider: { organization: "StreetKode Fam", url: origin },
    version: "1.0.0",
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: true },
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json"],
    skills: [
      {
        id: "browse_catalog",
        name: "Browse catalog",
        description:
          "Return every purchasable SKU as a typed offer: title, sizes, availability, price and the stablecoins accepted.",
        tags: ["commerce", "catalog", "streetwear"],
        endpoint: { method: "GET", path: "/api/public/catalog" },
      },
      {
        id: "quote",
        name: "Quote an order",
        description:
          "Request a purchase without payment. Returns HTTP 402 carrying the payment requirement (amount, asset, payTo, chain, nonce).",
        tags: ["commerce", "x402", "quote"],
        endpoint: { method: "POST", path: "/api/public/purchase" },
      },
      {
        id: "purchase",
        name: "Purchase",
        description:
          "Re-send the order with an X-PAYMENT header carrying the Arc transaction hash. The server verifies the transfer on-chain before releasing the fulfilment object.",
        tags: ["commerce", "x402", "settlement", "usdc"],
        endpoint: { method: "POST", path: "/api/public/purchase" },
      },
    ],
    extensions: {
      payments: {
        protocol: "x402-style challenge/settle/verify",
        schemes: ["exact"],
        networks: [ARC_CAIP2],
        assets: [
          {
            symbol: "USDC",
            address: USDC_ARC,
            decimals: 6,
            caip19: `${ARC_CAIP2}/slip44:60`,
          },
        ],
        payTo,
        demoScale: DEMO_SCALE,
        gasToken: "USDC",
      },
      rights: {
        registry: RIGHTS_REGISTRY,
        chain: ARC_CAIP2,
        explorer: `https://testnet.arcscan.app/address/${RIGHTS_REGISTRY}`,
        description:
          "DanceMoveTokens — the move-rights registry. An offer's provenance pointer resolves to a log() event naming the choreographer and the IPFS rights CID.",
      },
    },
  };
}
