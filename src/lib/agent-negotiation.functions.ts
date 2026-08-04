import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAisaJson } from "@/lib/aisa.server";

const CatalogItemSchema = z.object({
  sku: z.string(),
  title: z.string(),
  description: z.string(),
  priceMinor: z.string(),
  currency: z.string(),
  category: z.string(),
});

const SpendPolicySchema = z.object({
  agentId: z.string(),
  maxPerItemUsdc: z.number(),
  dailyCapUsdc: z.number(),
  confirmAboveUsdc: z.number(),
  allowedCategories: z.array(z.string()),
});

const Input = z.object({
  goal: z.string().min(1).max(500),
  catalog: z.array(CatalogItemSchema).min(1),
  policy: SpendPolicySchema,
  turns: z.number().int().min(2).max(8).default(4),
});

export type NegotiationTurn = {
  role: "buyer" | "seller";
  message: string;
  quote?: { sku: string; title: string; quantity: number; unitPriceUsdc: number; totalUsdc: number } | null;
  action?: "offer" | "counter" | "accept" | "reject";
};

function sellerSystemPrompt(catalog: z.infer<typeof CatalogItemSchema>[]) {
  const lines = catalog
    .map(
      (c) =>
        `- sku: ${c.sku} | title: ${c.title} | priceMinor: ${c.priceMinor} ${c.currency} | category: ${c.category} | ${c.description.slice(0, 120)}`,
    )
    .join("\n");

  const example = catalog[0];
  const exampleQuote = example
    ? `{ "sku": "${example.sku}", "title": "${example.title}", "quantity": 1, "unitPriceUsdc": ${Number(example.priceMinor) / 1e6}, "totalUsdc": ${Number(example.priceMinor) / 1e6} }`
    : `{ "sku": "...", "title": "...", "quantity": 1, "unitPriceUsdc": 0.0, "totalUsdc": 0.0 }`;

  return `You are the StreetKode seller agent, a street-dance streetwear merchant.\n` +
    `You negotiate with another agent (not a human). Be concise, friendly, and professional.\n` +
    `Catalog:\n${lines}\n\n` +
    `Rules:\n` +
    `- Only quote items from the catalog.\n` +
    `- unitPriceUsdc and totalUsdc MUST be the numeric USDC value (priceMinor / 1_000_000).\n` +
    `- If the buyer asks for something unavailable, offer the closest match or politely decline.\n` +
    `- When the buyer agrees, set action to "accept" and include the final quote.\n` +
    `- ALWAYS include the "quote" field, even if it is null.\n\n` +
    `Reply ONLY as JSON in this exact shape:\n` +
    `{ "reply": "your short message", "action": "offer|accept|reject", "quote": ${exampleQuote} }`;
}

function buyerSystemPrompt(goal: string, policy: z.infer<typeof SpendPolicySchema>) {
  return `You are a buyer agent representing a street-dance fan.\n` +
    `Goal: ${goal}\n` +
    `Spend policy you MUST obey:\n` +
    `- max per item: ${policy.maxPerItemUsdc} USDC\n` +
    `- daily cap: ${policy.dailyCapUsdc} USDC\n` +
    `- human confirmation required above: ${policy.confirmAboveUsdc} USDC\n` +
    `- allowed categories: ${policy.allowedCategories.join(", ")}\n\n` +
    `Rules:\n` +
    `- You may only agree to items within the allowed categories and under the per-item cap.\n` +
    `- If a quote is too expensive, counter with a lower offer or ask for alternatives.\n` +
    `- If a quote is acceptable, set action to "accept".\n` +
    `- Keep replies short (1-2 sentences).\n\n` +
    `Reply ONLY as JSON in this exact shape:\n` +
    `{ "reply": "your short message", "action": "counter|accept|reject" }`;
}

function transcriptToText(transcript: NegotiationTurn[]): string {
  return transcript
    .map((t) => `${t.role.toUpperCase()}: ${t.message}${t.quote ? ` [quote: ${JSON.stringify(t.quote)}]` : ""}`)
    .join("\n");
}

const SellerQuoteSchema = z.object({
  sku: z.string().optional().default(""),
  title: z.string().optional().default(""),
  quantity: z.number().int().positive().optional().default(1),
  unitPriceUsdc: z.number().optional().default(0),
  totalUsdc: z.number().optional().default(0),
});

const SellerReplySchema = z.object({
  reply: z.string(),
  action: z.enum(["offer", "accept", "reject"]),
  quote: SellerQuoteSchema.nullable().optional().default(null),
});

const BuyerReplySchema = z.object({
  reply: z.string(),
  action: z.enum(["counter", "accept", "reject"]),
});

export const runNegotiation = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["AISA_API_KEY"];
    if (!apiKey) throw new Error("AISA_API_KEY is not configured");

    const transcript: NegotiationTurn[] = [
      {
        role: "buyer",
        message: `Hi, I'd like to ${data.goal}. What can you offer?`,
        action: "counter",
      },
    ];

    for (let i = 0; i < data.turns; i++) {
      // Seller turn
      const sellerRaw = await callAisaJson<unknown>(apiKey, [
        { role: "system", content: sellerSystemPrompt(data.catalog) },
        { role: "user", content: transcriptToText(transcript) },
      ]);
      const seller = SellerReplySchema.parse(sellerRaw);
      const normalizedQuote = seller.quote
        ? normalizeQuote(seller.quote, data.catalog)
        : null;
      transcript.push({
        role: "seller",
        message: seller.reply,
        action: seller.action,
        quote: normalizedQuote,
      });

      if (seller.action === "accept" || seller.action === "reject") break;

      // Buyer turn
      const buyerRaw = await callAisaJson<unknown>(apiKey, [
        { role: "system", content: buyerSystemPrompt(data.goal, data.policy) },
        { role: "user", content: transcriptToText(transcript) },
      ]);
      const buyer = BuyerReplySchema.parse(buyerRaw);
      transcript.push({ role: "buyer", message: buyer.reply, action: buyer.action });

      if (buyer.action === "accept" || buyer.action === "reject") break;
    }

    let finalQuote: NegotiationTurn["quote"] = null;
    for (let i = transcript.length - 1; i >= 0; i--) {
      const t = transcript[i];
      if (t.role === "seller" && t.quote) {
        finalQuote = t.quote;
        break;
      }
    }

    return {
      transcript,
      finalQuote,
      policy: data.policy,
      goal: data.goal,
    };
  });
