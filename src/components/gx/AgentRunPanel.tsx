import { useEffect, useState } from "react";
import { loadPolicy, loadSpentToday, type SpendPolicy, DEFAULT_POLICY } from "@/lib/spend-policy";
import { SpendPolicyPanel } from "./SpendPolicyPanel";
import { RunLedger } from "./RunLedger";
import { InterruptCard } from "./InterruptCard";
import { useAgentRun, type AgentOrder } from "./useAgentRun";

export function AgentRunPanel({
  order,
  cta,
  children,
}: {
  order: AgentOrder | null;
  cta: string;
  children?: React.ReactNode;
}) {
  const [policy, setPolicy] = useState<SpendPolicy>(DEFAULT_POLICY);
  const [spentToday, setSpentToday] = useState(0);
  const { steps, busy, run, interrupt, answerInterrupt } = useAgentRun(policy);

  useEffect(() => {
    setPolicy(loadPolicy());
    setSpentToday(loadSpentToday());
  }, []);

  useEffect(() => {
    if (!busy) setSpentToday(loadSpentToday());
  }, [busy, steps.length]);

  return (
    <div className="space-y-5">
      <SpendPolicyPanel policy={policy} onChange={setPolicy} spentToday={spentToday} />

      {children}

      <button
        disabled={busy || !order}
        onClick={() => order && run(order)}
        className="h-12 w-full rounded-full bg-primary px-4 text-sm font-black text-black transition hover:bg-primary/85 disabled:opacity-40"
      >
        {busy ? "Agent task running…" : cta}
      </button>

      {interrupt && (
        <InterruptCard
          order={interrupt.order}
          outcome={interrupt.outcome}
          onAnswer={answerInterrupt}
        />
      )}

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Run ledger</p>
        <RunLedger steps={steps} />
      </div>
    </div>
  );
}
