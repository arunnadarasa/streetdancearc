import { useState } from "react";
import { savePolicy, type SpendPolicy } from "@/lib/spend-policy";
import { JsonBlock } from "./JsonBlock";
import { toMandateConstraints } from "@/lib/spend-policy";

const FIELDS: Array<{ key: keyof SpendPolicy; label: string; step: number }> = [
  { key: "maxPerItemUsdc", label: "Max per item (USDC)", step: 0.01 },
  { key: "dailyCapUsdc", label: "Daily cap (USDC)", step: 0.1 },
  { key: "confirmAboveUsdc", label: "Ask me above (USDC)", step: 0.01 },
];

export function SpendPolicyPanel({
  policy,
  onChange,
  spentToday,
}: {
  policy: SpendPolicy;
  onChange: (p: SpendPolicy) => void;
  spentToday: number;
}) {
  const [showJson, setShowJson] = useState(false);

  const set = (key: keyof SpendPolicy, value: number) => {
    const next = { ...policy, [key]: value };
    onChange(next);
    savePolicy(next);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-glow">
          Payment mandate
        </p>
        <h3 className="mt-1 text-lg font-black text-foreground">What the agent may spend</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          The agent never sees a checkout page. It sees these constraints. Anything outside the
          envelope is refused before a single byte hits the network.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {f.label}
            </span>
            <input
              type="number"
              min="0"
              step={f.step}
              inputMode="decimal"
              value={policy[f.key] as number}
              onChange={(e) => set(f.key, Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          Spent today:{" "}
          <span className="font-bold text-foreground">{spentToday.toFixed(4)} USDC</span> of{" "}
          {policy.dailyCapUsdc} USDC
        </span>
        <button
          onClick={() => setShowJson((v) => !v)}
          className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-muted-foreground hover:bg-surface"
        >
          {showJson ? "Hide" : "Show"} mandate JSON
        </button>
      </div>

      {showJson && <JsonBlock label="ap2.payment-mandate" value={toMandateConstraints(policy)} />}
    </section>
  );
}
