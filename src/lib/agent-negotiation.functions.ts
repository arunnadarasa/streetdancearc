import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAisaJson } from "@/lib/aisa.server";
import { deriveBudget } from "@/lib/negotiation-budget";


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

/** Max discount the seller may concede across the negotiation. */
const DISCOUNT_FLOOR = 0.15;

type Catalog = z.infer<typeof CatalogItemSchema>[];
type Policy = z.infer<typeof SpendPolicySchema>;

function usdc(item: z.infer<typeof CatalogItemSchema>) {
  return Number(item.priceMinor) / 1e6;
}


function sellerSystemPrompt(catalog: Catalog, budget: number, isFinalTurn: boolean) {
  const lines = catalog
    .map(
      (c) =>
        `- sku: ${c.sku} | title: ${c.title} | priceMinor: ${c.priceMinor} ${c.currency} | listUsdc: ${usdc(c).toFixed(6)} | floorUsdc: ${(usdc(c) * (1 - DISCOUNT_FLOOR)).toFixed(6)} | category: ${c.category} | ${c.description.slice(0, 120)}`,
    )
    .join("\n");

  const example = catalog[0];
  const exampleQuote = example
    ? `{ "sku": "${example.sku}", "title": "${example.title}", "quantity": 1, "unitPriceUsdc": ${usdc(example)}, "totalUsdc": ${usdc(example)} }`
    : `{ "sku": "...", "title": "...", "quantity": 1, "unitPriceUsdc": 0.0, "totalUsdc": 0.0 }`;

  return `You are the StreetRail seller agent, a street-dance streetwear merchant.\n` +
    `You negotiate with another agent (not a human). Be concise, friendly, and professional.\n` +
    `Your job is to CLOSE A DEAL. Never end the conversation empty-handed if any item can work.\n` +
    `Catalog (listUsdc = list price, floorUsdc = the lowest you may go):\n${lines}\n\n` +
    `The buyer's budget is about ${budget.toFixed(6)} USDC.\n\n` +
    `Rules:\n` +
    `- Only quote items from the catalog.\n` +
    `- You MAY discount down to floorUsdc (up to ${Math.round(DISCOUNT_FLOOR * 100)}% off list). Concede in decreasing steps.\n` +
    `- If the buyer counters, respond with a DISCOUNTED price, never a flat refusal.\n` +
    `- If your floor is still above the buyer's budget, substitute the cheapest item in the same or a related category and quote that instead.\n` +
    `- Only use action "reject" if the catalog genuinely has nothing relevant.\n` +
    `- unitPriceUsdc and totalUsdc MUST be numeric USDC values (not minor units).\n` +
    `- ALWAYS include the "quote" field, even if it is null.\n` +
    (isFinalTurn
      ? `- THIS IS THE FINAL TURN: make your best-and-final offer at or near floorUsdc and set action to "offer" or "accept". Do not refuse.\n`
      : "") +
    `\nReply ONLY as JSON in this exact shape:\n` +
    `{ "reply": "your short message", "action": "offer|accept|reject", "quote": ${exampleQuote} }`;
}

function buyerSystemPrompt(goal: string, policy: Policy, budget: number, isFinalTurn: boolean) {
  return `You are a buyer agent representing a street-dance fan.\n` +
    `Goal: ${goal}\n` +
    `Your working budget for this purchase is ${budget.toFixed(6)} USDC.\n` +
    `Spend policy you MUST obey:\n` +
    `- max per item: ${policy.maxPerItemUsdc} USDC\n` +
    `- daily cap: ${policy.dailyCapUsdc} USDC\n` +
    `- human confirmation required above: ${policy.confirmAboveUsdc} USDC\n` +
    `- allowed categories: ${policy.allowedCategories.join(", ")}\n\n` +
    `Rules:\n` +
    `- Accept any quote in an allowed category at or under ${policy.maxPerItemUsdc} USDC — a slightly-over-budget but in-policy price is still a deal worth taking.\n` +
    `- If a quote is above your budget, counter ONCE with a lower offer rather than walking away.\n` +
    `- Keep replies short (1-2 sentences).\n` +
    (isFinalTurn
      ? `- THIS IS THE FINAL TURN: accept the best quote on the table if it is within the per-item cap and an allowed category.\n`
      : "") +
    `\nReply ONLY as JSON in this exact shape:\n` +
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
  quantity: z.number().int().optional().default(1),
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

function normalizeQuote(
  quote: z.infer<typeof SellerQuoteSchema>,
  catalog: Catalog,
): z.infer<typeof SellerQuoteSchema> {
  const item = catalog.find((c) => c.sku.toLowerCase() === quote.sku.toLowerCase()) ?? catalog[0];
  if (!item) return quote;

  const qty = Math.max(1, Number(quote.quantity) || 1);
  const list = usdc(item);
  // LLMs sometimes return priceMinor raw (e.g. 15000) instead of decimal USDC (0.015).
  // If the value is clearly in minor units (> 100), convert it.
  let unit = Number(quote.unitPriceUsdc) || list;
  if (unit > 100) unit = unit / 1e6;
  // Clamp to the discount ladder: never below the floor, never above list.
  const floor = list * (1 - DISCOUNT_FLOOR);
  unit = Math.min(list, Math.max(floor, unit));
  return {
    sku: item.sku,
    title: item.title,
    quantity: qty,
    unitPriceUsdc: unit,
    totalUsdc: unit * qty,
  };
}

function inPolicy(
  quote: NonNullable<NegotiationTurn["quote"]>,
  catalog: Catalog,
  policy: Policy,
): boolean {
  const item = catalog.find((c) => c.sku === quote.sku);
  if (item && !policy.allowedCategories.includes(item.category)) return false;
  return quote.totalUsdc > 0 && quote.totalUsdc <= policy.maxPerItemUsdc;
}

export const runNegotiation = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["AISA_API_KEY"];
    if (!apiKey) throw new Error("AISA_API_KEY is not configured");

    const budget = deriveBudget(data.catalog, data.policy);

    const transcript: NegotiationTurn[] = [
      {
        role: "buyer",
        message: `Hi, I'd like to ${data.goal}. My budget is around ${budget.toFixed(4)} USDC. What can you offer?`,
        action: "counter",
      },
    ];

    let accepted = false;

    for (let i = 0; i < data.turns; i++) {
      const isFinalTurn = i === data.turns - 1;

      // Seller turn
      const sellerRaw = await callAisaJson<unknown>(apiKey, [
        { role: "system", content: sellerSystemPrompt(data.catalog, budget, isFinalTurn) },
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

      if (seller.action === "accept") {
        accepted = true;
        break;
      }
      if (seller.action === "reject") break;

      // Buyer turn
      const buyerRaw = await callAisaJson<unknown>(apiKey, [
        { role: "system", content: buyerSystemPrompt(data.goal, data.policy, budget, isFinalTurn) },
        { role: "user", content: transcriptToText(transcript) },
      ]);
      const buyer = BuyerReplySchema.parse(buyerRaw);
      transcript.push({ role: "buyer", message: buyer.reply, action: buyer.action });

      if (buyer.action === "accept") {
        accepted = true;
        break;
      }
      if (buyer.action === "reject") break;
    }

    // Best in-policy quote the seller put on the table, cheapest first.
    const quotes = transcript
      .filter((t) => t.role === "seller" && t.quote)
      .map((t) => t.quote!)
      .filter((q) => inPolicy(q, data.catalog, data.policy))
      .sort((a, b) => a.totalUsdc - b.totalUsdc);

    let finalQuote: NegotiationTurn["quote"] = null;
    let outcome: "accepted" | "fallback" | "no-deal" = "no-deal";
    let reason = "";

    if (accepted) {
      for (let i = transcript.length - 1; i >= 0; i--) {
        const t = transcript[i];
        if (t.role === "seller" && t.quote && inPolicy(t.quote, data.catalog, data.policy)) {
          finalQuote = t.quote;
          break;
        }
      }
      if (finalQuote) {
        outcome = "accepted";
      }
    }

    if (!finalQuote && quotes.length > 0) {
      // Deterministic safety net: close on the best in-policy quote offered.
      finalQuote = quotes[0]!;
      outcome = "fallback";
      transcript.push({
        role: "buyer",
        message: `Agreed — I'll take ${finalQuote.title} at ${finalQuote.totalUsdc.toFixed(6)} USDC. That's within my mandate, so I'll settle now.`,
        action: "accept",
        quote: finalQuote,
      });
    }

    if (!finalQuote) {
      if (data.catalog.length === 0) {
        reason = "The catalog came back empty, so there was nothing to quote.";
      } else {
        const anyAllowed = data.catalog.some((c) => data.policy.allowedCategories.includes(c.category));
        reason = anyAllowed
          ? `Every quote on the table was above the ${data.policy.maxPerItemUsdc} USDC per-item cap in the spend policy.`
          : `No catalog item fell inside the policy's allowed categories (${data.policy.allowedCategories.join(", ")}).`;
      }
    }

    return {
      transcript,
      finalQuote,
      outcome,
      reason,
      budget,
      policy: data.policy,
      goal: data.goal,
    };
  });

