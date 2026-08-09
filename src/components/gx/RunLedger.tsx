import { useEffect, useState } from "react";
import { Loader2, Check, X, AlertTriangle, CircleDot, Braces } from "lucide-react";
import { JsonBlock } from "./JsonBlock";
import { ReceiptButton } from "./ReceiptButton";
import type { RunStep } from "./useAgentRun";

function StatusIcon({ status }: { status: RunStep["status"] }) {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-glow" />;
  if (status === "ok") return <Check className="h-4 w-4 text-glow" />;
  if (status === "failed") return <X className="h-4 w-4 text-red-400" />;
  if (status === "blocked") return <X className="h-4 w-4 text-red-400" />;
  return <AlertTriangle className="h-4 w-4 text-amber-400" />;
}

/** Endpoint-ish titles keep the monospace treatment; prose titles don't. */
function isTechnical(title: string): boolean {
  return /^(GET|POST|PUT|PATCH|DELETE)\b/.test(title) || title.includes("/") || title.includes("_");
}


type RunState = "running" | "settled" | "blocked" | "failed" | "done";

function summarise(steps: RunStep[]): {
  state: RunState;
  done: number;
  total: number;
  receipt?: RunStep;
} {
  const total = steps.length;
  const done = steps.filter((s) => s.status === "ok").length;
  const receipt = [...steps].reverse().find((s) => s.href);
  let state: RunState = "done";
  if (steps.some((s) => s.status === "running")) state = "running";
  else if (steps.some((s) => s.status === "failed")) state = "failed";
  else if (steps.some((s) => s.status === "blocked" || s.status === "waiting")) state = "blocked";
  else if (receipt) state = "settled";
  return { state, done, total, receipt };
}

const STATE_CHIP: Record<RunState, { label: string; cls: string }> = {
  running: { label: "Agent working", cls: "border-glow/50 bg-glow/10 text-glow" },
  settled: { label: "Settled on Midnight", cls: "border-primary/50 bg-primary/15 text-foreground" },
  blocked: { label: "Waiting on you", cls: "border-amber-500/50 bg-amber-500/10 text-amber-200" },
  failed: { label: "Run failed", cls: "border-red-500/50 bg-red-500/10 text-red-300" },
  done: { label: "Run complete", cls: "border-border bg-background/60 text-muted-foreground" },
};

export function RunLedger({ steps }: { steps: RunStep[] }) {
  const [rawAll, setRawAll] = useState(false);
  // A fresh run collapses everything again.
  useEffect(() => {
    if (steps.length === 0) setRawAll(false);
  }, [steps.length]);

  if (steps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        <CircleDot className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
        No task running. Every agent action — discovery, quote, mandate check, settlement,
        verification — gets written here as it happens.
      </div>
    );
  }

  const { state, done, total, receipt } = summarise(steps);
  const chip = STATE_CHIP[state];
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Summary bar — status, progress, and the receipt up front */}
      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${chip.cls}`}
          >
            {state === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
            {chip.label}
          </span>
          <span className="font-mono text-[11px] font-bold text-muted-foreground">
            {done}/{total} steps
          </span>
          <button
            type="button"
            onClick={() => setRawAll((v) => !v)}
            aria-pressed={rawAll}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
              rawAll
                ? "border-glow/50 bg-glow/10 text-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Braces className="h-3.5 w-3.5" />
            {rawAll ? "Hide raw JSON" : "Raw JSON"}
          </button>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/70">
          <div
            className="h-full rounded-full bg-glow transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {receipt?.href && (
          <div className="mt-3.5">
            <ReceiptButton href={receipt.href} />
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {receipt.detail ?? "The agent's transfer is confirmed on Midnight Undeployed."}
            </p>
          </div>
        )}
      </div>

      <ol className="space-y-2.5">
        {steps.map((step, i) => {
          const bad = step.status === "failed" || step.status === "blocked";
          const technical = isTechnical(step.title);
          return (
            <li key={step.id} className="rounded-2xl border border-border bg-card/70 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-background text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex min-w-0 items-start gap-2">
                    <p
                      className={`min-w-0 flex-1 break-words text-sm font-black leading-snug text-foreground ${
                        technical ? "font-mono text-xs" : ""
                      }`}
                    >
                      {step.title}
                    </p>
                    <span className="mt-0.5 shrink-0">
                      <StatusIcon status={step.status} />
                    </span>
                  </div>

                  {step.detail && (
                    <p className="text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
                  )}

                  {step.href && <ReceiptButton href={step.href} label="View on indexer" />}

                  {step.payload !== undefined && (
                    <JsonBlock
                      key={rawAll ? "open" : "closed"}
                      label={step.payloadLabel ?? "payload"}
                      value={step.payload}
                      tone={step.tone ?? "neutral"}
                      collapsible
                      defaultOpen={rawAll || bad}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
