import { Loader2, Check, X, AlertTriangle, CircleDot } from "lucide-react";
import { JsonBlock } from "./JsonBlock";
import type { RunStep } from "./useAgentRun";

function StatusIcon({ status }: { status: RunStep["status"] }) {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-[#1DB954]" />;
  if (status === "ok") return <Check className="h-4 w-4 text-[#1DB954]" />;
  if (status === "failed") return <X className="h-4 w-4 text-red-400" />;
  if (status === "blocked") return <X className="h-4 w-4 text-red-400" />;
  return <AlertTriangle className="h-4 w-4 text-amber-400" />;
}

export function RunLedger({ steps }: { steps: RunStep[] }) {
  if (steps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
        <CircleDot className="mx-auto mb-2 h-4 w-4 text-neutral-700" />
        No task running. Every agent action — discovery, quote, mandate check, settlement,
        verification — gets written here as it happens.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li
          key={step.id}
          className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-neutral-700 bg-black text-[10px] font-bold text-neutral-400">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="min-w-0 break-words font-mono text-xs font-bold text-white">
                  {step.title}
                </p>
                <StatusIcon status={step.status} />
              </div>
              {step.detail && (
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">{step.detail}</p>
              )}
              {step.href && (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block break-all text-xs font-bold text-[#1DB954] hover:underline"
                >
                  View on Arcscan →
                </a>
              )}
            </div>
          </div>
          {step.payload !== undefined && (
            <JsonBlock
              label={step.payloadLabel ?? "payload"}
              value={step.payload}
              tone={step.tone ?? "neutral"}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
