import type { PolicyOutcome } from "@/lib/spend-policy";
import type { AgentOrder } from "./useAgentRun";

export function InterruptCard({
  order,
  outcome,
  amountLabel,
  onAnswer,
}: {
  order: AgentOrder;
  outcome: PolicyOutcome;
  amountLabel?: string;
  onAnswer: (approved: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-5 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
        Task state · input-required
      </p>
      <p className="text-sm font-bold text-white">
        The agent wants to buy {order.quantity} × {order.title}
        {amountLabel ? ` for ${amountLabel}` : ""}.
      </p>
      <p className="text-xs leading-relaxed text-amber-100/80">{outcome.reason}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAnswer(true)}
          className="rounded-full bg-[#1DB954] px-5 py-2 text-xs font-bold text-black hover:bg-[#1ed760]"
        >
          Approve spend
        </button>
        <button
          onClick={() => onAnswer(false)}
          className="rounded-full border border-neutral-600 px-5 py-2 text-xs font-bold text-white hover:bg-black/30"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
