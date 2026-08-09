/**
 * "Why Midnight" economics / privacy card (kept filename for import stability).
 */

const ROWS = [
  {
    rail: "Public L1 (no privacy)",
    gas: "Fees + full ledger disclosure",
    verdict: "Every CID, buyer, and mandate is public forever.",
    tone: "bad" as const,
  },
  {
    rail: "Typical L2 + escrow",
    gas: "Cheaper, still transparent",
    verdict: "Agents still leak spend policy and identity on-chain.",
    tone: "warn" as const,
  },
  {
    rail: "Midnight Undeployed",
    gas: "tDUST fees · ZK circuits",
    verdict: "Witnesses stay private; only disclose() lands on the public ledger.",
    tone: "good" as const,
  },
];

const TONE: Record<"bad" | "warn" | "good", string> = {
  bad: "text-red-400",
  warn: "text-amber-400",
  good: "text-glow",
};

export function WhyArc() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card/70">
      <div className="border-b border-border/60 px-5 py-5 sm:px-7">
        <p className="eyebrow">The economics</p>
        <h3 className="display mt-2 text-xl text-foreground sm:text-2xl">
          Private-by-default settlement for agentic streetwear
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          StreetRail anchors move CIDs, AP2 mandates, UCP orders, and experimental{" "}
          <strong className="text-foreground">mUSDC</strong> transfers on Midnight Local Undeployed.
          Circuit inputs stay private unless the Compact contract calls{" "}
          <strong className="text-foreground">disclose()</strong>. Writes go through the genesis
          wallet (server-append) because Lace cannot sign on Undeployed.
        </p>
      </div>

      <div className="divide-y divide-border/60">
        {ROWS.map((r) => (
          <div
            key={r.rail}
            className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,9rem)_minmax(0,12rem)_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-7"
          >
            <p className="text-sm font-bold text-foreground">{r.rail}</p>
            <p className={`text-sm font-semibold ${TONE[r.tone]}`}>{r.gas}</p>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{r.verdict}</p>
          </div>
        ))}
      </div>

      <p className="border-t border-border/60 px-5 py-4 text-[11px] leading-relaxed text-muted-foreground sm:px-7">
        Local stack: midnight-node:0.22.5 · indexer-standalone:4.0.2 · proof-server:8.0.3. Verify
        anchors with a GraphQL POST to the indexer — not a simulated tx hash.
      </p>
    </div>
  );
}

export const WhyMidnight = WhyArc;
