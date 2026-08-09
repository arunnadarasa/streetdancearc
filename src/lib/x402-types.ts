/** Shared x402 types (safe for client + server). */

export type PaymentRequirements = {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
};

export type PaymentPayloadV2 = {
  x402Version: 2;
  resource?: { url?: string; description?: string };
  accepted: PaymentRequirements;
  payload: {
    nonce: string;
    from?: string;
    memo?: string;
    chunkHash?: string;
    txHash?: string;
  };
};
