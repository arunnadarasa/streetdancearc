import { ARC_EXPLORER, TOKENS, caip19, type TokenKey } from "@/lib/tokens";
import contract from "@/data/contract.json";

export const RIGHTS_REGISTRY = contract.address;

export type A2hKind = "payout" | "approval" | "offer" | "mandate";

export interface A2hMessage {
  id: string;
  kind: A2hKind;
  agent: string;
  at: string;
  title: string;
  body: string;
  amount?: { value: string; token: TokenKey };
  receiptUrl?: string;
  envelope: Record<string, unknown>;
}

/** The standing AP2 mandate the human pre-signs so agents may push value to them. */
export const STANDING_MANDATE = {
  type: "ap2.payout-mandate",
  version: "0.1",
  subject: "did:privy:choreographer:krumpline",
  agent: "did:web:streetrail.lovable.app#rights-agent",
  settle_token: "USDC",
  chain: "eip155:5042002",
  per_payout_cap: "5.00",
  daily_cap: "25.00",
  notify: ["payout", "approval", "offer", "mandate"],
  expires_at: "2026-08-12T00:00:00Z",
} as const;

const tx = (hash: string) => `${ARC_EXPLORER}/tx/${hash}`;

/** Seeded, deterministic — the inbox reads the same for every judge. */
export const A2H_FEED: A2hMessage[] = [
  {
    id: "msg_a2h_001",
    kind: "payout",
    agent: "Rights Agent",
    at: "2026-08-05T07:12:04Z",
    title: "Paid you 2.40 USDC for krump-2024-w32",
    body:
      "1,204 licensed plays settled since your last payout. Inside your per-payout cap, so I sent it without asking.",
    amount: { value: "2.40", token: "USDC" },
    receiptUrl: tx("0x9a3f1c7e5b2d84af06c19e73d5b8a4102f6c8d31e07b45a9c2f81d6e3b04752a"),
    envelope: {
      jsonrpc: "2.0",
      method: "message/send",
      params: {
        message: {
          role: "agent",
          parts: [
            {
              kind: "data",
              data: {
                type: "ap2.payout-executed",
                move_cid: "krump-2024-w32",
                plays: 1204,
                unit_price: "0.002",
                total: { amount: "2.40", token: "USDC" },
                mandate: "ap2.payout-mandate#per_payout_cap=5.00",
                registry: `${ARC_EXPLORER}/address/${RIGHTS_REGISTRY}`,
                receipt: tx(
                  "0x9a3f1c7e5b2d84af06c19e73d5b8a4102f6c8d31e07b45a9c2f81d6e3b04752a",
                ),
              },
            },
          ],
        },
      },
    },
  },
  {
    id: "msg_a2h_002",
    kind: "approval",
    agent: "Rights Agent",
    at: "2026-08-05T06:48:19Z",
    title: "Approve 12.80 EURC payout? Above your cap",
    body:
      "A Paris studio licensed 'toprock-cypher-01' for a campaign. The payout is 12.80 EURC — over your 5.00 per-payout ceiling, so it's paused until you say yes.",
    amount: { value: "12.80", token: "EURC" },
    envelope: {
      jsonrpc: "2.0",
      method: "message/send",
      params: {
        message: {
          role: "agent",
          parts: [
            {
              kind: "data",
              data: {
                type: "ap2.approval-required",
                reason: "amount_exceeds_per_payout_cap",
                requested: { amount: "12.80", token: "EURC" },
                cap: { amount: "5.00", token: "USDC" },
                licensee: "did:web:studio-marais.fr",
                move_cid: "toprock-cypher-01",
                task_state: "input-required",
              },
            },
          ],
        },
      },
    },
  },
  {
    id: "msg_a2h_003",
    kind: "offer",
    agent: "Drop Agent",
    at: "2026-08-05T05:31:00Z",
    title: "cirBTC moved — your snapback drops 8% for 6h",
    body:
      "Treasury is over its cirBTC target, so I'm discounting the Cypher Snapback for holders who settle in cirBTC. Expires in 6 hours.",
    amount: { value: "0.00041", token: "cirBTC" },
    envelope: {
      jsonrpc: "2.0",
      method: "message/send",
      params: {
        message: {
          role: "agent",
          parts: [
            {
              kind: "data",
              data: {
                type: "ucp.offer-pushed",
                sku: "cypher-snapback",
                discount_bps: 800,
                settle_token: "cirBTC",
                price: { amount: "0.00041", token: "cirBTC" },
                expires_in_s: 21600,
              },
            },
          ],
        },
      },
    },
  },
  {
    id: "msg_a2h_004",
    kind: "mandate",
    agent: "Rights Agent",
    at: "2026-08-04T21:02:47Z",
    title: "Your payout authorization expires in 3 days",
    body:
      "Renew the standing mandate to keep royalties flowing without a signature each time. Nothing stops if you ignore this — payouts just queue for approval instead.",
    envelope: {
      jsonrpc: "2.0",
      method: "message/send",
      params: {
        message: {
          role: "agent",
          parts: [
            {
              kind: "data",
              data: {
                type: "ap2.mandate-expiring",
                mandate: "ap2.payout-mandate",
                expires_at: STANDING_MANDATE.expires_at,
                fallback: "queue_for_manual_approval",
              },
            },
          ],
        },
      },
    },
  },
];

/**
 * Re-denominate the inbox into the currently selected settlement token.
 *
 * The seeded feed is written in whatever token the agent originally used;
 * switching the global toggle re-quotes every payout through the same demo
 * FX oracle the merchant uses, so A2H honours the currency choice like the
 * other three modes.
 */
export function redenominate(feed: A2hMessage[], token: TokenKey): A2hMessage[] {
  return feed.map((msg) => {
    if (!msg.amount || msg.amount.token === token) return msg;
    const usd = Number(msg.amount.value) / TOKENS[msg.amount.token].perUsd;
    const places = TOKENS[token].decimals === 8 ? 8 : 2;
    const value = (usd * TOKENS[token].perUsd).toFixed(places);
    return {
      ...msg,
      title: msg.title.replace(
        `${msg.amount.value} ${msg.amount.token}`,
        `${value} ${token}`,
      ),
      body: msg.body.replace(
        `${msg.amount.value} ${msg.amount.token}`,
        `${value} ${token}`,
      ),
      amount: { value, token },
    };
  });
}

/** The standing mandate, expressed in the active settlement token. */
export function mandateFor(token: TokenKey) {
  const cap = (usd: string) => (Number(usd) * TOKENS[token].perUsd).toFixed(TOKENS[token].decimals === 8 ? 8 : 2);
  return {
    ...STANDING_MANDATE,
    settle_token: token,
    settle_asset: caip19(token),
    per_payout_cap: cap(STANDING_MANDATE.per_payout_cap),
    daily_cap: cap(STANDING_MANDATE.daily_cap),
  };
}
