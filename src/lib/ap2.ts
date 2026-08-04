// AP2-style payment mandates — client-safe types and helpers.
// This demo signs mandates in server logic only; on-chain anchoring to a
// MandateVault contract is marked as a future enhancement.
// Spec: https://github.com/google-agentic-commerce/AP2

import { ARC_CAIP2 } from "./agent-card";

export const AP2_VERSION = "0.1";

export type CartMandate = {
  ap2Version: string;
  type: "CartMandate";
  cartId: string;
  merchant: { name: string; payTo: `0x${string}` };
  items: Array<{
    id: string;
    title: string;
    description?: string;
    quantity: number;
    unitPrice: { value: string; asset: string };
    resource?: { type: string; sku: string };
  }>;
  totals: Array<{ label: string; value: string; asset: string }>;
  network: string;
  chainId: number;
  issuedAt: string;
  expiresAt: string;
  signature: string;
};

export type PaymentMandate = {
  ap2Version: string;
  type: "PaymentMandate";
  paymentMandateId: string;
  refersTo: { cartId: string };
  payer: { address: `0x${string}`; network: string; chainId: number };
  payee: { payTo: `0x${string}`; network: string; chainId: number };
  amount: { label: string; value: string; asset: string };
  proof?: { scheme: "evm-tx"; txHash: `0x${string}`; network: string; chainId: number };
  issuedAt: string;
  signature: string;
};

export type SpendConstraints = {
  type: "ap2.payment-mandate.constraints";
  agent_id: string;
  currency: string;
  network: string;
  limits: { per_item_max: number; daily_max: number; human_confirmation_above: number };
  merchant_allowlist: string[];
  category_allowlist: string[];
};

export interface CatalogItem {
  sku: string;
  title: string;
  description: string;
  priceMinor: string;
  currency: string;
  category: string;
}

export function buildCartMandate(
  item: CatalogItem,
  quantity: number,
  payTo: `0x${string}`,
  merchantName: string,
): CartMandate {
  const total = (BigInt(item.priceMinor) * BigInt(quantity)).toString();
  return {
    ap2Version: AP2_VERSION,
    type: "CartMandate",
    cartId: `cart_${crypto.randomUUID()}`,
    merchant: { name: merchantName, payTo },
    items: [
      {
        id: item.sku,
        title: item.title,
        description: item.description,
        quantity,
        unitPrice: { value: item.priceMinor, asset: item.currency },
        resource: { type: "physical-sku", sku: item.sku },
      },
    ],
    totals: [{ label: "Total", value: total, asset: item.currency }],
    network: ARC_CAIP2,
    chainId: 5042002,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    signature: "demo:none",
  };
}

export function buildPaymentMandate(
  cart: CartMandate,
  payer: `0x${string}`,
  txHash?: `0x${string}`,
): PaymentMandate {
  const total = cart.totals.find((t) => t.label === "Total") ?? cart.totals[0];
  return {
    ap2Version: AP2_VERSION,
    type: "PaymentMandate",
    paymentMandateId: `pm_${crypto.randomUUID()}`,
    refersTo: { cartId: cart.cartId },
    payer: { address: payer, network: ARC_CAIP2, chainId: 5042002 },
    payee: { payTo: cart.merchant.payTo, network: ARC_CAIP2, chainId: 5042002 },
    amount: { label: total.label, value: total.value, asset: total.asset },
    proof: txHash
      ? { scheme: "evm-tx", txHash, network: ARC_CAIP2, chainId: 5042002 }
      : undefined,
    issuedAt: new Date().toISOString(),
    signature: "demo:none",
  };
}

export function buildSpendConstraints(
  policy: { agentId: string; maxPerItemUsdc: number; dailyCapUsdc: number; confirmAboveUsdc: number; allowedCategories: string[] },
): SpendConstraints {
  return {
    type: "ap2.payment-mandate.constraints",
    agent_id: policy.agentId,
    currency: "USDC",
    network: ARC_CAIP2,
    limits: {
      per_item_max: policy.maxPerItemUsdc,
      daily_max: policy.dailyCapUsdc,
      human_confirmation_above: policy.confirmAboveUsdc,
    },
    merchant_allowlist: ["streetkode-storefront"],
    category_allowlist: policy.allowedCategories,
  };
}
