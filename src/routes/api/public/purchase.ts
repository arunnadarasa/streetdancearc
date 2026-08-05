import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ARC_CAIP2, DEMO_SCALE, USDC_ARC } from "@/lib/agent-card";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
};

const PUBLIC_RPC = "https://rpc.testnet.arc.network";
const MAX_TX_AGE_SECONDS = 30 * 60;

const OrderSchema = z.object({
  sku: z.string().min(1).max(200),
  variantId: z.string().min(1).max(300).optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  listedAmount: z.number().min(0).max(100000),
  currency: z.string().min(2).max(8).default("GBP"),
  agentId: z.string().min(1).max(100).optional(),
  rightsCid: z.string().max(200).optional(),
});

const PaymentSchema = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  from: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  nonce: z.string().max(100).optional(),
});

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Arc RPC ${method} failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`Arc RPC ${method} error: ${json.error.message}`);
  return json.result as any;
}

function requiredAtomic(listedAmount: number, quantity: number) {
  // 6-decimal USDC, scaled down for testnet funds.
  return BigInt(Math.round(listedAmount * quantity * DEMO_SCALE * 1e6));
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
        const atomic = requiredAtomic(order.listedAmount, order.quantity);
        const resource = new URL(request.url).toString();

        const paymentHeader = request.headers.get("X-PAYMENT");

        // ---- No payment: return the 402 challenge -------------------------
        if (!paymentHeader) {
          return Response.json(
            {
              x402Version: 2,
              error: "payment_required",
              accepts: [
                {
                  scheme: "exact",
                  network: ARC_CAIP2,
                  asset: USDC_ARC,
                  amount: atomic.toString(),
                  amountFormatted: (Number(atomic) / 1e6).toFixed(6),
                  decimals: 6,
                  symbol: "USDC",
                  payTo,
                  resource,
                  description: `${order.quantity} × ${order.sku}`,
                  maxTimeoutSeconds: 300,
                  nonce: crypto.randomUUID(),
                  extra: {
                    settlement: "native USDC value transfer on Arc (USDC is the gas token)",
                    demoScale: DEMO_SCALE,
                    listed: `${order.listedAmount.toFixed(2)} ${order.currency} × ${order.quantity}`,
                  },
                },
              ],
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
          const to = String(tx?.to ?? "").toLowerCase();
          const value = BigInt(tx?.value ?? "0x0");
          const from = String(tx?.from ?? "").toLowerCase();

          if (to !== payTo.toLowerCase()) {
            return Response.json(
              { error: "wrong_recipient", expected: payTo, got: tx?.to ?? null },
              { status: 402, headers: CORS },
            );
          }
          if (value < atomic) {
            return Response.json(
              {
                error: "insufficient_payment",
                required: atomic.toString(),
                paid: value.toString(),
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
            payer: payment.from,
            amount: value.toString(),
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
                amountFormatted: `${(Number(value) / 1e6).toFixed(6)} USDC`,
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
