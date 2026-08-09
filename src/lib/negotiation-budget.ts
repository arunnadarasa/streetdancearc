/**
 * Recommended-budget derivation shared by the negotiation server function and
 * the buyer-goal prefill in the UI, so the number shown and the number the
 * agents negotiate against can never drift apart.
 */

export type BudgetCatalogItem = {
  sku: string;
  title: string;
  priceMinor: string;
  category: string;
};

export type BudgetPolicy = {
  maxPerItemUsdc: number;
  allowedCategories: string[];
};

export function usdcFromMinor(priceMinor: string): number {
  return Number(priceMinor) / 1e6;
}

/** Items in a category the spend policy allows (falls back to the whole catalog). */
export function inPolicyItems<T extends BudgetCatalogItem>(catalog: T[], policy: BudgetPolicy): T[] {
  const allowed = catalog.filter((c) => policy.allowedCategories.includes(c.category));
  return allowed.length > 0 ? allowed : catalog;
}

/** Cheapest in-policy item, or null when the catalog has no usable prices. */
export function cheapestInPolicy<T extends BudgetCatalogItem>(
  catalog: T[],
  policy: BudgetPolicy,
): T | null {
  const pool = inPolicyItems(catalog, policy).filter((c) => {
    const n = usdcFromMinor(c.priceMinor);
    return Number.isFinite(n) && n > 0;
  });
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => (usdcFromMinor(a.priceMinor) <= usdcFromMinor(b.priceMinor) ? a : b));
}

/**
 * Budget derived from the live catalog rather than hardcoded in the goal text:
 * cheapest in-policy item plus headroom, capped by the per-item policy limit.
 */
export function deriveBudget(catalog: BudgetCatalogItem[], policy: BudgetPolicy): number {
  const cheapestItem = cheapestInPolicy(catalog, policy);
  if (!cheapestItem) return policy.maxPerItemUsdc;
  const cheapest = usdcFromMinor(cheapestItem.priceMinor);
  return Math.min(policy.maxPerItemUsdc, Math.max(cheapest * 1.1, cheapest + 0.001));
}

/** Round up to 3 decimals so the displayed budget never sits below the derived one. */
export function displayBudget(budget: number): string {
  return (Math.ceil(budget * 1000) / 1000).toFixed(3);
}

const CATEGORY_NOUNS: Record<string, string> = {
  headwear: "snapback cap",
  sneakers: "pair of sneakers",
  outerwear: "jacket",
  tops: "tee",
  bottoms: "pair of trousers",
  accessories: "accessory",
};

/**
 * Default buyer goal, naming both the recommended budget and something that is
 * actually buyable at that price.
 */
export function recommendedGoal(catalog: BudgetCatalogItem[], policy: BudgetPolicy): string {
  const budget = deriveBudget(catalog, policy);
  const cheapestItem = cheapestInPolicy(catalog, policy);
  const noun = (cheapestItem && CATEGORY_NOUNS[cheapestItem.category]) || "streetwear piece";
  return `Buy a ${noun} under ${displayBudget(budget)} USDC in the selected stablecoin for practice sessions`;
}
