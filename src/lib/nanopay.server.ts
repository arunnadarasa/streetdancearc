// Circle Nanopayments status adapter — server-only and Worker-safe.
//
// The buyer agent holds its own EOA so it can sign EIP-3009 authorisations
// against Circle's Gateway Wallet. That key is DERIVED deterministically from
// MANDATE_SIGNING_SEED, so no extra secret has to be managed by hand.
//
// Circle's batching SDK currently pulls Solana Anchor into the Worker bundle,
// which crashes SSR during module initialization. Until the SDK publishes a
// Worker-safe entry, every path returns the existing structured fallback and
// the caller continues through direct Arc settlement.

import { privateKeyToAccount } from "viem/accounts";

const CHAIN = "arcTestnet" as const;

export interface NanopayStatus {
  chain: string;
  agentAddress: string | null;
  walletUsdc: string | null;
  gatewayUsdc: string | null;
  available: boolean;
  reason?: string;
}

export interface NanopayResult {
  simulated: boolean;
  reason?: string;
  amount?: string;
  transferId?: string;
  data?: unknown;
  agentAddress?: string | null;
  batched: boolean;
}

function seed(): string {
  const s = process.env["MANDATE_SIGNING_SEED"];
  if (!s) throw new Error("missing_secret:MANDATE_SIGNING_SEED");
  return s;
}

/** Deterministic per-app agent key: sha256(seed || label). Never leaves the server. */
export async function agentPrivateKey(): Promise<`0x${string}`> {
  const bytes = new TextEncoder().encode(`${seed()}:streetrail-gateway-agent`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}

export async function agentAddress(): Promise<string> {
  return privateKeyToAccount(await agentPrivateKey()).address;
}

/** Wallet + Gateway USDC balances for the buyer agent. */
export async function nanopayStatus(): Promise<NanopayStatus> {
  const base: NanopayStatus = {
    chain: CHAIN,
    agentAddress: null,
    walletUsdc: null,
    gatewayUsdc: null,
    available: false,
  };
  try {
    base.agentAddress = await agentAddress();
    base.reason = "batching_sdk_unavailable_on_worker";
    return base;
  } catch (e) {
    base.reason = e instanceof Error ? e.message : String(e);
    return base;
  }
}

/** Does this x402 resource advertise a Circle batching option? */
export async function nanopaySupports(url: string): Promise<{ supported: boolean; reason?: string }> {
  void url;
  return { supported: false, reason: "batching_sdk_unavailable_on_worker" };
}

/**
 * Pay an x402 resource through Circle Gateway batching.
 * Falls back to `{ simulated: true }` so the demo never dead-ends.
 */
export async function nanopay(url: string, body?: unknown): Promise<NanopayResult> {
  void url;
  void body;
  const addr = await agentAddress().catch(() => null);
  return {
    simulated: true,
    batched: false,
    agentAddress: addr,
    reason: "batching_sdk_unavailable_on_worker",
  };
}

/** Deposit USDC from the agent EOA into its Gateway balance (one-off funding step). */
export async function nanopayDeposit(amount: string): Promise<NanopayResult> {
  return {
    simulated: true,
    batched: false,
    amount,
    agentAddress: await agentAddress().catch(() => null),
    reason: "batching_sdk_unavailable_on_worker",
  };
}
