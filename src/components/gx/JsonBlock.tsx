export interface JsonBlockProps {
  label: string;
  value: unknown;
  tone?: "neutral" | "green" | "amber" | "red";
}

const TONES: Record<string, string> = {
  neutral: "border-border bg-background/60 text-muted-foreground",
  green: "border-primary/40 bg-primary/10 text-foreground/80",
  amber: "border-amber-500/40 bg-amber-500/5 text-amber-200",
  red: "border-red-500/40 bg-red-500/5 text-red-200",
};

export function JsonBlock({ label, value, tone = "neutral" }: JsonBlockProps) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <pre
        className={`max-h-72 w-full min-w-0 max-w-full overflow-y-auto whitespace-pre-wrap break-all rounded-xl border p-3 font-mono text-[11px] leading-relaxed sm:max-h-96 ${TONES[tone]}`}
      >
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>

    </div>
  );
}
