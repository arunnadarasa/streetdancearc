import { ARC_EXPLORER, TOKENS, caip19, getTokenUsdRate, type TokenKey, type FxRates } from "@/lib/tokens";
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
  registryUrl?: string;
  /** Present on approval cards — the USD value the human is being asked to release. */
  approval?: { usd: number; moveCid: string };
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

export const tx = (hash: string) => `${ARC_EXPLORER}/tx/${hash}`;

export interface ChainPayout {
  txHash: string;
  moveCid: string;
  to: string;
  token: TokenKey;
  value: string;
  atSeconds: number;
  receiptUrl: string;
}

/** Turn a Logged event read off Arc into an inbox card. */
export function payoutToMessage(p: ChainPayout): A2hMessage {
  return {
    id: `chain_${p.txHash}`,
    kind: "payout",
    agent: "Rights Agent",
    at: new Date(p.atSeconds * 1000).toISOString(),
    title: `Paid you ${p.value} ${p.token} for ${p.moveCid}`,
    body:
      "Licensed plays settled since your last payout. Inside your per-payout cap, so I sent it without asking — the treasury signed, you did not.",
    amount: { value: p.value, token: p.token },
    receiptUrl: p.receiptUrl,
    registryUrl: `${ARC_EXPLORER}/address/${RIGHTS_REGISTRY}`,
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
                move_cid: p.moveCid,
                total: { amount: p.value, token: p.token, asset: caip19(p.token) },
                recipient: p.to,
                mandate: "ap2.payout-mandate#per_payout_cap=5.00",
                registry: `${ARC_EXPLORER}/address/${RIGHTS_REGISTRY}`,
                receipt: p.receiptUrl,
                settled_at: new Date(p.atSeconds * 1000).toISOString(),
              },
            },
          ],
        },
      },
    },
  };
}

/** Above-cap request: real money moves only after the human approves. */
export function approvalMessage(usd: number, token: TokenKey, fx?: FxRates | null): A2hMessage {
  const places = TOKENS[token].decimals === 8 ? 8 : 2;
  const value = (usd * getTokenUsdRate(token, fx)).toFixed(places);
  const moveCid = "toprock-cypher-01";
  return {
    id: "req_a2h_approval",
    kind: "approval",
    agent: "Rights Agent",
    at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    title: `Approve ${value} ${token} payout? Above your cap`,
    body: `A Paris studio licensed '${moveCid}' for a campaign. The payout is ${value} ${token} — over your per-payout ceiling, so nothing leaves the treasury until you say yes.`,
    amount: { value, token },
    approval: { usd, moveCid },
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
                requested: { amount: value, token, asset: caip19(token) },
                cap: { amount: "5.00", token: "USD" },
                licensee: "did:web:studio-marais.fr",
                move_cid: moveCid,
                task_state: "input-required",
              },
            },
          ],
        },
      },
    },
  };
}

/** Non-financial notices the agent pushes; no chain write involved. */
export function noticeMessages(token: TokenKey, fx?: FxRates | null): A2hMessage[] {
  const places = TOKENS[token].decimals === 8 ? 8 : 2;
  const offer = (0.00052 / getTokenUsdRate("cirBTC", fx) * getTokenUsdRate(token, fx)).toFixed(places);
  return [
    {
      id: "msg_a2h_offer",
      kind: "offer",
      agent: "Drop Agent",
      at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      title: `Treasury rebalance — your snapback drops 8% for 6h`,
      body: `Treasury is over its target, so I'm discounting the Cypher Snapback for holders who settle in ${token}. Expires in 6 hours.`,
      amount: { value: offer, token },
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
                  settle_token: token,
                  price: { amount: offer, token, asset: caip19(token) },
                  expires_in_s: 21600,
                },
              },
            ],
          },
        },
      },
    },
    {
      id: "msg_a2h_mandate",
      kind: "mandate",
      agent: "Rights Agent",
      at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
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
}

/** Session-scoped mandate expiry, updated when the human renews from the inbox. */
let sessionMandateExpiry: string | null = null;
export function setMandateExpiry(iso: string) {
  sessionMandateExpiry = iso;
}
export function getMandateExpiry() {
  return sessionMandateExpiry ?? STANDING_MANDATE.expires_at;
}

/** The standing mandate, expressed in the active settlement token. */
export function mandateFor(token: TokenKey, fx?: FxRates | null) {
  const cap = (usd: string) =>
    (Number(usd) * getTokenUsdRate(token, fx)).toFixed(TOKENS[token].decimals === 8 ? 8 : 2);
  return {
    ...STANDING_MANDATE,
    settle_token: token,
    settle_asset: caip19(token),
    per_payout_cap: cap(STANDING_MANDATE.per_payout_cap),
    daily_cap: cap(STANDING_MANDATE.daily_cap),
    expires_at: getMandateExpiry(),
  };
}
