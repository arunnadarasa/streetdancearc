// AP2-style payment-mandate constraints, enforced client-side before any
// network call. The agent cannot spend outside this envelope.

export interface SpendPolicy {
  agentId: string;
  maxPerItemUsdc: number;
  dailyCapUsdc: number;
  confirmAboveUsdc: number;
  allowedCategories: string[];
}

export const DEFAULT_POLICY: SpendPolicy = {
  agentId: "stylist-agent-01",
  maxPerItemUsdc: 0.25,
  dailyCapUsdc: 1.0,
  confirmAboveUsdc: 0.05,
  allowedCategories: ["sneakers", "headwear", "outerwear", "tops", "bottoms", "accessories"],
};

export type PolicyOutcome =
  | { decision: "allow"; reason: string }
  | { decision: "confirm"; reason: string; constraint: string }
  | { decision: "deny"; reason: string; constraint: string };

export function evaluatePolicy(
  policy: SpendPolicy,
  input: { amountUsdc: number; spentTodayUsdc: number; category: string },
): PolicyOutcome {
  if (!policy.allowedCategories.includes(input.category)) {
    return {
      decision: "deny",
      reason: `Category "${input.category}" is not in the allowlist.`,
      constraint: "allowedCategories",
    };
  }
  if (input.amountUsdc > policy.maxPerItemUsdc) {
    return {
      decision: "deny",
      reason: `${input.amountUsdc.toFixed(4)} USDC exceeds the ${policy.maxPerItemUsdc} USDC per-item cap.`,
      constraint: "maxPerItemUsdc",
    };
  }
  if (input.spentTodayUsdc + input.amountUsdc > policy.dailyCapUsdc) {
    return {
      decision: "deny",
      reason: `This would take today's spend to ${(input.spentTodayUsdc + input.amountUsdc).toFixed(4)} USDC, over the ${policy.dailyCapUsdc} USDC daily cap.`,
      constraint: "dailyCapUsdc",
    };
  }
  if (input.amountUsdc > policy.confirmAboveUsdc) {
    return {
      decision: "confirm",
      reason: `${input.amountUsdc.toFixed(4)} USDC is above the ${policy.confirmAboveUsdc} USDC auto-approve threshold, so a human has to confirm.`,
      constraint: "confirmAboveUsdc",
    };
  }
  return {
    decision: "allow",
    reason: `Within every constraint — the agent settles without interrupting anyone.`,
  };
}

// Rendered as the AP2 payment-mandate constraint set the agent carries.
export function toMandateConstraints(policy: SpendPolicy) {
  return {
    type: "ap2.payment-mandate.constraints",
    agent_id: policy.agentId,
    currency: "USDC",
    network: "eip155:5042002",
    limits: {
      per_item_max: policy.maxPerItemUsdc,
      daily_max: policy.dailyCapUsdc,
      human_confirmation_above: policy.confirmAboveUsdc,
    },
    merchant_allowlist: ["streetkode-storefront"],
    category_allowlist: policy.allowedCategories,
  };
}

const KEY = "gx.spend-policy";
const SPENT_KEY = "gx.spent-today";

export function loadPolicy(): SpendPolicy {
  if (typeof window === "undefined") return DEFAULT_POLICY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_POLICY, ...JSON.parse(raw) } : DEFAULT_POLICY;
  } catch {
    return DEFAULT_POLICY;
  }
}

export function savePolicy(p: SpendPolicy) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function loadSpentToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(SPENT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { day: string; total: number };
    return parsed.day === new Date().toISOString().slice(0, 10) ? parsed.total : 0;
  } catch {
    return 0;
  }
}

export function addSpentToday(amount: number) {
  if (typeof window === "undefined") return;
  const total = loadSpentToday() + amount;
  window.localStorage.setItem(
    SPENT_KEY,
    JSON.stringify({ day: new Date().toISOString().slice(0, 10), total }),
  );
}
