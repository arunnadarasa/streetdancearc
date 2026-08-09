// Shared A2A-style Agent Card for the StreetRail storefront agent.

export const AGENT_NAME = "streetrail-storefront";
export const DEMO_SCALE = 0.001;

export const MIDNIGHT_NETWORK = "midnight:undeployed";
export const MUSDC_ASSET = "midnight:musdc";
export const RIGHTS_REGISTRY =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_DEFAULT_CONTRACT?: string } }).env?.VITE_DEFAULT_CONTRACT) ||
  "undeployed-move-registry";

/** @deprecated */
export const ARC_CAIP2 = MIDNIGHT_NETWORK;
/** @deprecated */
export const USDC_ARC = MUSDC_ASSET;

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
  const indexer =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { VITE_INDEXER_URL?: string } }).env?.VITE_INDEXER_URL) ||
    "http://localhost:8088/api/v4/graphql";
  return {
    protocolVersion: "0.3.0",
    name: AGENT_NAME,
    description:
      "Street dance streetwear storefront on Midnight Local Undeployed. Settles experimental mUSDC via x402-style challenges and anchors move rights on a Compact MoveRegistry.",
    url: `${origin}/api/public/agent-card`,
    provider: { organization: "StreetKode Fam", url: origin },
    version: "2.0.0-midnight",
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
          "Request a purchase without payment. Returns HTTP 402 carrying the midnight-mUSDC payment requirement.",
        tags: ["commerce", "x402", "quote"],
        endpoint: { method: "POST", path: "/api/public/purchase" },
      },
      {
        id: "purchase",
        name: "Purchase",
        description:
          "Settle via POST /api/public/musdc-transfer (Undeployed server-append) and return fulfilment.",
        tags: ["commerce", "x402", "settlement", "musdc", "midnight"],
        endpoint: { method: "POST", path: "/api/public/purchase" },
      },
    ],
    extensions: {
      payments: {
        protocol: "x402-style challenge/settle/verify",
        schemes: ["midnight-mUSDC"],
        networks: [MIDNIGHT_NETWORK],
        assets: [
          {
            symbol: "mUSDC",
            address: MUSDC_ASSET,
            decimals: 6,
            caip19: `${MIDNIGHT_NETWORK}/musdc`,
          },
        ],
        payTo,
        demoScale: DEMO_SCALE,
        gasToken: "tDUST",
      },
      rights: {
        registry: RIGHTS_REGISTRY,
        chain: MIDNIGHT_NETWORK,
        explorer: indexer,
        description:
          "MoveRegistry Compact contract — appendEntry discloses a CID/message and author commitment.",
      },
    },
  };
}
