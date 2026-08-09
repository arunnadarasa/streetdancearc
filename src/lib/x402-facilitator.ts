/**
 * x402 helpers for StreetRail on Midnight Undeployed (midnight-mUSDC).
 * Adapted from https://github.com/arunnadarasa/x402midnight
 */
import { createHash } from "node:crypto";
import { MIDNIGHT_NETWORK, MUSDC_ASSET } from "@/lib/agent-card";
import type { PaymentPayloadV2, PaymentRequirements } from "@/lib/x402-types";

export type { PaymentPayloadV2, PaymentRequirements };

export const X402_SCHEME = "midnight-mUSDC";
export const X402_NETWORK = MIDNIGHT_NETWORK;
export const X402_ASSET = MUSDC_ASSET;

/** Deterministic 32-byte merchant payTo for mUSDC (hex, no 0x). */
export function defaultMusdcPayTo(): string {
  const label = process.env["VITE_TREASURY_LABEL"] ?? "streetrail:treasury:v1";
  return createHash("sha256").update(label).digest("hex");
}

export function musdcContractAddress(): string {
  return (
    process.env["VITE_MUSDC_CONTRACT"] ||
    // lazy read via env only — routes may also import deploy JSON
    ""
  );
}

export function getHeaderCI(headers: Headers, name: string): string | null {
  const want = name.toLowerCase();
  for (const [k, v] of headers.entries()) {
    if (k.toLowerCase() === want) return v;
  }
  return null;
}

export function encodePaymentSignature(payload: PaymentPayloadV2): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decodePaymentSignature(raw: string): PaymentPayloadV2 {
  let json: string;
  try {
    json = Buffer.from(raw, "base64").toString("utf8");
  } catch {
    throw new Error("invalid_payload: PAYMENT-SIGNATURE is not base64");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("invalid_payload: PAYMENT-SIGNATURE is not JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_payload: expected object");
  }
  const p = parsed as Record<string, unknown>;
  if (p.x402Version !== 2) {
    throw new Error("invalid_payload: x402Version must be 2");
  }
  if (!p.accepted || typeof p.accepted !== "object") {
    throw new Error("invalid_payload: wrap requirement under accepted");
  }
  if (!p.payload || typeof p.payload !== "object") {
    throw new Error("invalid_payload: missing payload");
  }
  return p as unknown as PaymentPayloadV2;
}

export function validatePayloadAgainstRequirement(
  payload: PaymentPayloadV2,
  expected?: Partial<PaymentRequirements> & { memo?: string; chunkHash?: string },
): { ok: true } | { ok: false; error: string } {
  const a = payload.accepted;
  if (a.scheme !== X402_SCHEME) {
    return { ok: false, error: `invalid_payload: scheme must be ${X402_SCHEME}` };
  }
  if (!String(a.network).startsWith("midnight:")) {
    return { ok: false, error: "invalid_payload: midnight scheme requires midnight:<net>" };
  }
  if (expected?.network && a.network !== expected.network) {
    return { ok: false, error: "invalid_payload: network mismatch" };
  }
  if (expected?.amount && String(a.amount) !== String(expected.amount)) {
    return { ok: false, error: "invalid_payload: amount mismatch" };
  }
  if (expected?.payTo) {
    const want = expected.payTo.toLowerCase().replace(/^0x/, "");
    const got = a.payTo.toLowerCase().replace(/^0x/, "");
    if (want !== got) return { ok: false, error: "invalid_payload: payTo mismatch" };
  }
  if (expected?.asset && a.asset.toLowerCase() !== expected.asset.toLowerCase()) {
    return { ok: false, error: "invalid_payload: asset mismatch" };
  }

  const nonce = payload.payload?.nonce;
  if (!nonce || typeof nonce !== "string") {
    return { ok: false, error: "invalid_payload: nonce required" };
  }
  const hex = nonce.replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return { ok: false, error: "invalid_payload: nonce must be 32-byte hex" };
  }

  if (expected?.chunkHash) {
    const ch =
      payload.payload.chunkHash ??
      (typeof a.extra?.chunkHash === "string" ? a.extra.chunkHash : undefined);
    if (
      ch &&
      ch.replace(/^0x/i, "").toLowerCase() !==
        expected.chunkHash.replace(/^0x/i, "").toLowerCase()
    ) {
      return { ok: false, error: "invalid_payload: chunkHash mismatch" };
    }
  }
  return { ok: true };
}

export function buildMidnightRequirement(opts: {
  amount: string;
  payTo: string;
  asset?: string;
  memo?: string;
  chunkHash?: string;
  sku?: string;
}): PaymentRequirements {
  return {
    scheme: X402_SCHEME,
    network: X402_NETWORK,
    amount: String(opts.amount),
    asset: opts.asset || X402_ASSET,
    payTo: opts.payTo.replace(/^0x/i, ""),
    maxTimeoutSeconds: 300,
    extra: {
      name: "mUSDC",
      version: "1",
      symbol: "mUSDC",
      decimals: 6,
      preferred: true,
      ...(opts.memo ? { memo: opts.memo } : {}),
      ...(opts.chunkHash ? { chunkHash: opts.chunkHash } : {}),
      ...(opts.sku ? { sku: opts.sku } : {}),
    },
  };
}

export function buildChallengeBody(opts: {
  resource: string;
  amount: string;
  payTo: string;
  asset?: string;
  memo?: string;
  chunkHash?: string;
  sku?: string;
  description?: string;
}) {
  return {
    x402Version: 2 as const,
    error: "payment_required",
    accepts: [
      buildMidnightRequirement({
        amount: opts.amount,
        payTo: opts.payTo,
        asset: opts.asset,
        memo: opts.memo,
        chunkHash: opts.chunkHash,
        sku: opts.sku,
      }),
    ],
    resource: {
      url: opts.resource,
      description: opts.description ?? "StreetRail settlement",
    },
  };
}

const settledNonces = new Map<string, unknown>();

export function getSettledNonce(nonceHex: string) {
  return settledNonces.get(nonceHex.toLowerCase().replace(/^0x/, ""));
}

export function setSettledNonce(nonceHex: string, result: unknown) {
  settledNonces.set(nonceHex.toLowerCase().replace(/^0x/, ""), result);
}

export function corsHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "content-type, PAYMENT-SIGNATURE, payment-signature, X-PAYMENT, x-payment, PAYMENT-RESPONSE, payment-response",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Expose-Headers": "PAYMENT-RESPONSE, payment-response, midnight-tx, X-PAYMENT-RESPONSE",
    ...extra,
  };
}
