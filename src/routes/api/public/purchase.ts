import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ARC_CAIP2, DEMO_SCALE } from "@/lib/agent-card";
import { TOKENS, TOKEN_KEYS, caip19, formatAmount, toAtomic, type TokenKey } from "@/lib/tokens";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
};

const PUBLIC_RPC = "https://rpc.testnet.arc.network";
const MAX_TX_AGE_SECONDS = 30 * 60;

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const OrderSchema = z.object({
  sku: z.string().min(1).max(200),
  variantId: z.string().min(1).max(300).optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  listedAmount: z.number().min(0).max(100000),
  currency: z.string().min(2).max(8).default("GBP"),
  /** Settlement currency. Any of Arc's three stablecoins. */
  token: z.enum(TOKEN_KEYS as [TokenKey, ...TokenKey[]]).default("USDC"),
  agentId: z.string().min(1).max(100).optional(),
  rightsCid: z.string().max(200).optional(),
});

const PaymentSchema = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  from: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  nonce: z.string().max(100).optional(),
});

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(process.env["ARC_RPC_URL"] || PUBLIC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Arc RPC ${method} failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`Arc RPC ${method} error: ${json.error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json.result as any;
}

/** Listed fiat -> atomic units of the chosen settlement token, scaled for testnet funds. */
function requiredAtomic(listedAmount: number, quantity: number, token: TokenKey) {
  const usd = listedAmount * quantity * DEMO_SCALE;
  return toAtomic(TOKENS[token].perUsd * usd, token);
}

const pad32 = (addr: string) => `0x${addr.slice(2).toLowerCase().padStart(64, "0")}`;

/**
 * How much of `token` reached `payTo` in this transaction.
 *
 * USDC is Arc's gas token, so a USDC payment is the native `value` field.
 * EURC and cirBTC are ERC-20s, so we sum matching Transfer logs emitted by
 * the token contract instead.
 */
function creditedAmount(
  token: TokenKey,
  payTo: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receipt: any,
): { credited: bigint; recipientSeen: string | null } {
  const cfg = TOKENS[token];

  if (cfg.native) {
    const to = String(tx?.to ?? "").toLowerCase();
    return {
      credited: to === payTo.toLowerCase() ? BigInt(tx?.value ?? "0x0") : 0n,
      recipientSeen: tx?.to ?? null,
    };
  }

  const wantTo = pad32(payTo);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs: any[] = Array.isArray(receipt?.logs) ? receipt.logs : [];
  let credited = 0n;
  let recipientSeen: string | null = null;

  for (const log of logs) {
    if (String(log?.address ?? "").toLowerCase() !== cfg.address.toLowerCase()) continue;
    const topics: string[] = log?.topics ?? [];
    if (topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    const dest = topics[2]?.toLowerCase() ?? "";
    recipientSeen = `0x${dest.slice(-40)}`;
    if (dest !== wantTo) continue;
    credited += BigInt(log?.data ?? "0x0");
  }

  return { credited, recipientSeen };
}

export const Route = createFileRoute("/api/public/purchase")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const payTo = process.env["CIRCLE_TREASURY_ADDRESS"] ?? "";
        if (!payTo) {
          return Response.json(
            { error: "merchant_unconfigured", detail: "No treasury address configured." },
            { status: 503, headers: CORS },
          );
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers: CORS });
        }

        const parsed = OrderSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "invalid_request", issues: parsed.error.issues.slice(0, 5) },
            { status: 400, headers: CORS },
          );
        }
        const order = parsed.data;
        const token = order.token;
        const cfg = TOKENS[token];
        const atomic = requiredAtomic(order.listedAmount, order.quantity, token);
        const resource = new URL(request.url).toString();

        const paymentHeader = request.headers.get("X-PAYMENT");

        // ---- No payment: return the 402 challenge -------------------------
        if (!paymentHeader) {
          return Response.json(
            {
              x402Version: 2,
              error: "payment_required",
              accepts: TOKEN_KEYS.map((k) => {
                const t = TOKENS[k];
                const a = requiredAtomic(order.listedAmount, order.quantity, k);
                return {
                  scheme: "exact",
                  network: ARC_CAIP2,
                  asset: caip19(k),
                  amount: a.toString(),
                  amountFormatted: formatAmount(a, k),
                  decimals: t.decimals,
                  symbol: t.symbol,
                  payTo,
                  resource,
                  description: `${order.quantity} × ${order.sku}`,
                  maxTimeoutSeconds: 300,
                  nonce: crypto.randomUUID(),
                  preferred: k === token,
                  extra: {
                    settlement: t.native
                      ? "native USDC value transfer on Arc (USDC is the gas token)"
                      : `ERC-20 transfer() of ${t.symbol} on Arc — gas still paid in USDC`,
                    tokenAddress: t.address,
                    demoScale: DEMO_SCALE,
                    fxNote: `demo oracle: 1 USD = ${t.perUsd} ${t.symbol}`,
                    listed: `${order.listedAmount.toFixed(2)} ${order.currency} × ${order.quantity}`,
                  },
                };
              }),
            },
            { status: 402, headers: CORS },
          );
        }

        // ---- Payment presented: verify it on Arc --------------------------
        let payment: z.infer<typeof PaymentSchema>;
        try {
          const decoded = JSON.parse(atob(paymentHeader));
          const p = PaymentSchema.safeParse(decoded);
          if (!p.success) {
            return Response.json(
              { error: "invalid_payment_payload", issues: p.error.issues.slice(0, 5) },
              { status: 400, headers: CORS },
            );
          }
          payment = p.data;
        } catch {
          return Response.json(
            { error: "invalid_payment_payload", detail: "X-PAYMENT must be base64 JSON." },
            { status: 400, headers: CORS },
          );
        }

        try {
          const receipt = await rpc("eth_getTransactionReceipt", [payment.txHash]);
          if (!receipt) {
            return Response.json(
              { error: "payment_not_found", detail: "Transaction not mined on Arc yet." },
              { status: 402, headers: CORS },
            );
          }
          if (receipt.status !== "0x1") {
            return Response.json({ error: "payment_reverted" }, { status: 402, headers: CORS });
          }

          const tx = await rpc("eth_getTransactionByHash", [payment.txHash]);
          const from = String(tx?.from ?? "").toLowerCase();
          const { credited, recipientSeen } = creditedAmount(token, payTo, tx, receipt);

          if (credited === 0n) {
            return Response.json(
              {
                error: "wrong_recipient",
                detail: `No ${cfg.symbol} credited to the merchant treasury in this transaction.`,
                expected: payTo,
                got: recipientSeen,
              },
              { status: 402, headers: CORS },
            );
          }
          if (credited < atomic) {
            return Response.json(
              {
                error: "insufficient_payment",
                token: cfg.symbol,
                required: atomic.toString(),
                paid: credited.toString(),
              },
              { status: 402, headers: CORS },
            );
          }
          if (from !== payment.from.toLowerCase()) {
            return Response.json({ error: "payer_mismatch" }, { status: 402, headers: CORS });
          }

          // Replay guard: only accept a recent transaction.
          const block = await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
          const ts = Number(BigInt(block?.timestamp ?? "0x0"));
          const age = Math.floor(Date.now() / 1000) - ts;
          if (ts > 0 && age > MAX_TX_AGE_SECONDS) {
            return Response.json(
              { error: "payment_expired", ageSeconds: age },
              { status: 402, headers: CORS },
            );
          }

          const settled = {
            success: true,
            transaction: payment.txHash,
            network: ARC_CAIP2,
            asset: caip19(token),
            payer: payment.from,
            amount: credited.toString(),
          };

          return Response.json(
            {
              type: "order",
              status: "fulfilment_pending",
              order_id: `SK-${payment.txHash.slice(2, 10).toUpperCase()}`,
              sku: order.sku,
              variant_id: order.variantId ?? null,
              quantity: order.quantity,
              settled: {
                ...settled,
                token: cfg.symbol,
                amountFormatted: formatAmount(credited, token),
                explorer: `https://testnet.arcscan.app/tx/${payment.txHash}`,
              },
              listed_total: `${(order.listedAmount * order.quantity).toFixed(2)} ${order.currency}`,
              rights_cid: order.rightsCid ?? null,
              fulfilment: {
                method: "ship_physical",
                next: "Merchant agent requests a shipping address over A2A input-required.",
              },
              issued_at: new Date().toISOString(),
            },
            {
              status: 200,
              headers: {
                ...CORS,
                "X-PAYMENT-RESPONSE": btoa(JSON.stringify(settled)),
              },
            },
          );
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          console.error("x402 verify failed:", detail);
          return Response.json({ error: "verification_failed", detail }, { status: 502, headers: CORS });
        }
      },
    },
  },
});
