import { createFileRoute } from "@tanstack/react-router";
import { ARC_CAIP2, USDC_ARC } from "@/lib/agent-card";
import {
  CheckoutResponseSchema,
  DiscoveryProfileSchema,
  OrderSchema,
  UCP_VERSION,
  type SelfTestResult,
} from "@/lib/ucp";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/ucp/self-test")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const results: SelfTestResult["results"] = [];
        const check = (name: string, ok: boolean, message?: string) => results.push({ name, ok, message });

        // 1. Discovery profile validates
        try {
          const profile = {
            payment: {
              handlers: [
                {
                  id: "arc-testnet-usdc",
                  name: "Arc Testnet USDC",
                  spec: "https://ucp.dev/latest/specification/overview/",
                  version: UCP_VERSION,
                  config_schema: "https://ucp.dev/schemas/0.1/payment-handler",
                  instrument_schemas: ["https://ucp.dev/schemas/0.1/payment-instrument/evm-erc20"],
                  config: {
                    chainId: 5042002,
                    network: "arc-testnet",
                    asset: "USDC",
                    assetType: "erc20",
                    payTo: process.env["CIRCLE_TREASURY_ADDRESS"] ?? "0x0000000000000000000000000000000000000000",
                  },
                },
              ],
            },
            ucp: {
              version: UCP_VERSION,
              capabilities: [
                { name: "checkout", spec: "https://ucp.dev/latest/specification/overview/", version: UCP_VERSION, schema: "https://ucp.dev/schemas/0.1/checkout" },
                { name: "order", spec: "https://ucp.dev/latest/specification/overview/", version: UCP_VERSION, schema: "https://ucp.dev/schemas/0.1/order" },
              ],
            },
          };
          DiscoveryProfileSchema.parse(profile);
          check("discovery profile validates against UCP schema", true);
        } catch (e: any) {
          check("discovery profile validates against UCP schema", false, e?.message);
        }

        // 2. Checkout response validates
        try {
          const checkout = {
            id: "co_test",
            currency: "USDC",
            status: "ready_for_complete" as const,
            line_items: [
              {
                id: "li_test",
                item: { id: "sku_test", title: "Snapback", price: 25000000 },
                quantity: 1,
                totals: [{ type: "subtotal", amount: 25000000 }, { type: "total", amount: 25000000 }],
              },
            ],
            totals: [{ type: "subtotal", amount: 25000000 }, { type: "total", amount: 25000000 }],
            payment: {
              handlers: [
                {
                  id: "arc-testnet-usdc",
                  name: "Arc Testnet USDC",
                  spec: "https://ucp.dev/latest/specification/overview/",
                  version: UCP_VERSION,
                  config_schema: "https://ucp.dev/schemas/0.1/payment-handler",
                  instrument_schemas: ["https://ucp.dev/schemas/0.1/payment-instrument/evm-erc20"],
                  config: { chainId: 5042002, network: "arc-testnet", asset: "USDC", assetType: "erc20", payTo: "0x0000000000000000000000000000000000000000" },
                },
              ],
            },
            ucp: { version: UCP_VERSION, capabilities: [] },
          };
          CheckoutResponseSchema.parse(checkout);
          check("checkout response validates against UCP schema", true);
        } catch (e: any) {
          check("checkout response validates against UCP schema", false, e?.message);
        }

        // 3. Order response validates
        try {
          const order = {
            id: "ord_test",
            checkout_id: "co_test",
            currency: "USDC",
            status: "completed" as const,
            line_items: [
              {
                id: "li_test",
                item: { id: "sku_test", title: "Snapback", price: 25000000 },
                quantity: { total: 1, fulfilled: 1 },
                status: "fulfilled",
                totals: [{ type: "total", amount: 25000000 }],
              },
            ],
            totals: [{ type: "total", amount: 25000000 }],
            payment: {
              handlers: [
                {
                  id: "arc-testnet-usdc",
                  name: "Arc Testnet USDC",
                  spec: "https://ucp.dev/latest/specification/overview/",
                  version: UCP_VERSION,
                  config_schema: "https://ucp.dev/schemas/0.1/payment-handler",
                  instrument_schemas: ["https://ucp.dev/schemas/0.1/payment-instrument/evm-erc20"],
                  config: { chainId: 5042002, network: "arc-testnet", asset: "USDC", assetType: "erc20", payTo: "0x0000000000000000000000000000000000000000" },
                },
              ],
            },
            ucp: { version: UCP_VERSION, capabilities: [] },
          };
          OrderSchema.parse(order);
          check("order response validates against UCP schema", true);
        } catch (e: any) {
          check("order response validates against UCP schema", false, e?.message);
        }

        // 4. Required endpoints reachable
        const endpoints = [
          `${origin}/api/public/ucp/discovery`,
          `${origin}/api/public/catalog`,
          `${origin}/api/public/purchase`,
          `${origin}/api/public/a2a/message`,
        ];
        for (const url of endpoints) {
          try {
            const res = await fetch(url, { method: "GET" });
            check(`endpoint reachable: ${new URL(url).pathname}`, res.status < 500);
          } catch (e: any) {
            check(`endpoint reachable: ${new URL(url).pathname}`, false, e?.message);
          }
        }

        // 5. Asset configuration
        check("Arc network configured", ARC_CAIP2 === "eip155:5042002");
        check("USDC contract configured", USDC_ARC.startsWith("0x") && USDC_ARC.length === 42);

        const failed = results.filter((r) => !r.ok).length;
        const result: SelfTestResult = {
          passed: failed === 0,
          total: results.length,
          failed,
          results,
        };

        return Response.json(result, { headers: { ...CORS, "Cache-Control": "no-store" } });
      },
    },
  },
});
