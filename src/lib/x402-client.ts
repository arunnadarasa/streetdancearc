/**
 * Browser helper: x402 challenge → verify → settle on Midnight Undeployed.
 */
import type { PaymentPayloadV2, PaymentRequirements } from "@/lib/x402-types";

export type X402SettleClientResult = {
  hash: string;
  from: string;
  to: string;
  atomic: string;
  nonce: string;
  simulated?: boolean;
  network?: string;
  paymentSignature: string;
};

function randomNonceHex() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodePaymentSignature(payload: PaymentPayloadV2): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

/** Full facilitator path used by shop cart + A2A negotiation. */
export async function settleViaX402Facilitator(opts: {
  amountAtomic: string | bigint;
  payTo?: string;
  memo?: string;
  sku?: string;
  from?: string;
  resource?: string;
}): Promise<X402SettleClientResult> {
  const amount = String(opts.amountAtomic);
  const resource = opts.resource ?? "/api/public/x402-settle";

  const challengeRes = await fetch("/api/public/x402-challenge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      amountAtomic: amount,
      resource,
      memo: opts.memo,
      sku: opts.sku,
      payTo: opts.payTo,
    }),
  });
  const challengeJson = (await challengeRes.json()) as {
    accepts?: PaymentRequirements[];
    error?: string;
  };
  if (challengeRes.status !== 402 || !challengeJson.accepts?.[0]) {
    throw new Error(challengeJson.error ?? `x402 challenge failed (${challengeRes.status})`);
  }

  const accepted = challengeJson.accepts[0];
  const nonce = randomNonceHex();
  const payment: PaymentPayloadV2 = {
    x402Version: 2,
    resource: { url: resource, description: opts.memo ?? opts.sku ?? "StreetRail settle" },
    accepted,
    payload: {
      nonce,
      from: opts.from,
      memo: opts.memo,
    },
  };
  const paymentSignature = encodePaymentSignature(payment);

  const verifyRes = await fetch("/api/public/x402-verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "PAYMENT-SIGNATURE": paymentSignature,
    },
    body: JSON.stringify({
      amount,
      payTo: accepted.payTo,
    }),
  });
  const verifyJson = (await verifyRes.json()) as {
    isValid?: boolean;
    invalidReason?: string;
  };
  if (!verifyRes.ok || !verifyJson.isValid) {
    throw new Error(verifyJson.invalidReason ?? `x402 verify failed (${verifyRes.status})`);
  }

  const settleRes = await fetch("/api/public/x402-settle", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "PAYMENT-SIGNATURE": paymentSignature,
    },
    body: JSON.stringify({
      amountAtomic: amount,
      memo: opts.memo,
    }),
  });
  const settleJson = (await settleRes.json()) as {
    ok?: boolean;
    error?: string;
    midnightTxHash?: string;
    fromPk?: string;
    toPk?: string;
    amount?: string;
    simulated?: boolean;
    network?: string;
    nonce?: string;
  };
  if (!settleRes.ok || !settleJson.ok) {
    throw new Error(settleJson.error ?? `x402 settle failed (${settleRes.status})`);
  }

  return {
    hash: settleJson.midnightTxHash || "",
    from: settleJson.fromPk || opts.from || "genesis",
    to: settleJson.toPk || accepted.payTo,
    atomic: settleJson.amount || amount,
    nonce: settleJson.nonce || nonce,
    simulated: settleJson.simulated,
    network: settleJson.network,
    paymentSignature,
  };
}
