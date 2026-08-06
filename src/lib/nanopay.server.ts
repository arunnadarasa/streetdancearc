// Circle Nanopayments (Gateway batching) — server-only.
//
// The buyer agent holds its own EOA so it can sign EIP-3009 authorisations
// against Circle's Gateway Wallet. That key is DERIVED deterministically from
// MANDATE_SIGNING_SEED, so no extra secret has to be managed by hand.
//
// Every path here is demo-safe: if the Gateway API, the agent balance or the
// x402 endpoint is not batching-capable, we return a structured
// `{ simulated: true, reason }` result and the caller falls back to the
// existing direct Arc transfer.

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

async function client() {
  const { GatewayClient } = await import("@circle-fin/x402-batching/client");
  return new GatewayClient({ chain: CHAIN, privateKey: await agentPrivateKey() });
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
    const gateway = await client();
    const balances = (await gateway.getBalances()) as unknown as {
      wallet?: { formatted?: string };
      gateway?: { formatted?: string; available?: string };
    };
    base.walletUsdc = balances.wallet?.formatted ?? null;
    base.gatewayUsdc = balances.gateway?.formatted ?? balances.gateway?.available ?? null;
    base.available = Number(base.gatewayUsdc ?? 0) > 0;
    if (!base.available) base.reason = "gateway_balance_zero";
    return base;
  } catch (e) {
    base.reason = e instanceof Error ? e.message : String(e);
    return base;
  }
}

/** Does this x402 resource advertise a Circle batching option? */
export async function nanopaySupports(url: string): Promise<{ supported: boolean; reason?: string }> {
  try {
    const gateway = await client();
    const res = (await gateway.supports(url)) as unknown as { supported?: boolean };
    return { supported: Boolean(res?.supported) };
  } catch (e) {
    return { supported: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Pay an x402 resource through Circle Gateway batching.
 * Falls back to `{ simulated: true }` so the demo never dead-ends.
 */
export async function nanopay(url: string, body?: unknown): Promise<NanopayResult> {
  const addr = await agentAddress().catch(() => null);
  try {
    const gateway = await client();
    const res = (await gateway.pay(url, body ? { method: "POST", body } : undefined)) as unknown as {
      amount?: string;
      transferId?: string;
      data?: unknown;
    };
    return {
      simulated: false,
      batched: true,
      amount: res.amount,
      transferId: res.transferId,
      data: res.data,
      agentAddress: addr,
    };
  } catch (e) {
    return {
      simulated: true,
      batched: false,
      agentAddress: addr,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Deposit USDC from the agent EOA into its Gateway balance (one-off funding step). */
export async function nanopayDeposit(amount: string): Promise<NanopayResult> {
  try {
    const gateway = await client();
    const res = (await gateway.deposit(amount)) as unknown as { depositTxHash?: string };
    return { simulated: false, batched: true, amount, data: res, agentAddress: await agentAddress() };
  } catch (e) {
    return { simulated: true, batched: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
