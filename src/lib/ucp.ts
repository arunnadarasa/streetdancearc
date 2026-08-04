// Universal Commerce Protocol (UCP) — client-safe types and helpers.
// This demo implements the UCP discovery profile and checkout/order shapes.
// RFC 9421 HTTP Message Signatures are declared in the profile but not enforced
// in this single-page demo so the app stays within the 5-credit budget.
// Spec: https://ucp.dev/latest/specification/overview/

import { z } from "zod";

export const UCP_VERSION = "0.1";

export const PaymentHandlerSchema = z.object({
  id: z.string(),
  name: z.string(),
  spec: z.string().url(),
  version: z.string(),
  config_schema: z.string().url(),
  instrument_schemas: z.array(z.string().url()),
  config: z.object({
    chainId: z.number(),
    network: z.string(),
    asset: z.string(),
    assetType: z.string(),
    payTo: z.string(),
    rpc: z.string().url().optional(),
  }),
});

export const CapabilitySchema = z.object({
  name: z.string(),
  spec: z.string().url(),
  version: z.string(),
  schema: z.string().url(),
  config: z.record(z.unknown()).optional(),
});

export const DiscoveryProfileSchema = z.object({
  payment: z.object({ handlers: z.array(PaymentHandlerSchema) }),
  signing_keys: z
    .array(
      z.object({
        kid: z.string(),
        kty: z.string(),
        crv: z.string().optional(),
        x: z.string().optional(),
        y: z.string().optional(),
        use: z.string().optional(),
        alg: z.string().optional(),
      }),
    )
    .optional(),
  ucp: z.object({
    version: z.string(),
    capabilities: z.array(CapabilitySchema),
    services: z.record(z.unknown()).optional(),
  }),
});

export const LineItemSchema = z.object({
  id: z.string(),
  item: z.object({ id: z.string(), title: z.string(), price: z.number() }),
  quantity: z.number().int().positive(),
  totals: z.array(z.object({ type: z.string(), amount: z.number() })),
});

export const CheckoutResponseSchema = z.object({
  id: z.string(),
  currency: z.string(),
  status: z.enum(["ready_for_complete", "completed", "expired", "canceled"]),
  line_items: z.array(LineItemSchema),
  totals: z.array(z.object({ type: z.string(), amount: z.number() })),
  expires_at: z.string().datetime().optional(),
  links: z.array(z.object({ type: z.string(), url: z.string().url(), title: z.string().optional() })).optional(),
  payment: z.object({ handlers: z.array(PaymentHandlerSchema) }),
  ucp: z.object({ version: z.string(), capabilities: z.array(CapabilitySchema) }),
  buyer: z.object({ full_name: z.string().optional() }).optional(),
});

export const OrderSchema = z.object({
  id: z.string(),
  checkout_id: z.string(),
  permalink_url: z.string().url().optional(),
  currency: z.string(),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  line_items: z.array(
    z.object({
      id: z.string(),
      item: z.object({ id: z.string(), title: z.string(), price: z.number() }),
      quantity: z.object({ total: z.number(), fulfilled: z.number() }),
      status: z.string(),
      totals: z.array(z.object({ type: z.string(), amount: z.number() })),
    }),
  ),
  totals: z.array(z.object({ type: z.string(), amount: z.number() })),
  fulfillment: z.object({ events: z.array(z.record(z.unknown())) }).optional(),
  payment: z.object({ handlers: z.array(PaymentHandlerSchema) }),
  ucp: z.object({ version: z.string(), capabilities: z.array(CapabilitySchema) }),
});

export type DiscoveryProfile = z.infer<typeof DiscoveryProfileSchema>;
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
export type Order = z.infer<typeof OrderSchema>;

export type SelfTestResult = {
  passed: boolean;
  total: number;
  failed: number;
  results: Array<{ name: string; ok: boolean; message?: string }>;
};
