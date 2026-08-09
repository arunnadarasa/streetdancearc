import { useState } from "react";
import { ChevronRight } from "lucide-react";

export interface JsonBlockProps {
  label: string;
  value: unknown;
  tone?: "neutral" | "green" | "amber" | "red";
  /** Render behind a "show payload" disclosure instead of always-on. */
  collapsible?: boolean;
  /** Start expanded (only meaningful with `collapsible`). */
  defaultOpen?: boolean;
}

const TONES: Record<string, string> = {
  neutral: "border-border bg-background/60 text-muted-foreground",
  green: "border-primary/40 bg-primary/10 text-foreground/80",
  amber: "border-amber-500/40 bg-amber-500/5 text-amber-200",
  red: "border-red-500/40 bg-red-500/5 text-red-200",
};

const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g;

function linkify(text: string) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    let url = match[0];
    // strip trailing punctuation that is part of the surrounding JSON, not the URL
    const trailing = url.match(/[.,;:]+$/);
    if (trailing) url = url.slice(0, -trailing[0].length);
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-glow underline decoration-glow/50 underline-offset-2 hover:decoration-glow"
      >
        {url}
      </a>,
    );
    last = match.index + url.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** "12 keys" / "8 lines" — enough to know what's hiding without opening it. */
function hintFor(value: unknown, text: string): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const n = Object.keys(value as object).length;
    return `${n} field${n === 1 ? "" : "s"}`;
  }
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  const lines = text.split("\n").length;
  return `${lines} line${lines === 1 ? "" : "s"}`;
}

export function JsonBlock({
  label,
  value,
  tone = "neutral",
  collapsible = false,
  defaultOpen = true,
}: JsonBlockProps) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const [open, setOpen] = useState(defaultOpen);
  const shown = collapsible ? open : true;

  const body = (
    <pre
      className={`max-h-72 w-full min-w-0 max-w-full overflow-y-auto whitespace-pre-wrap break-all rounded-xl border p-3 font-mono text-[11px] leading-relaxed sm:max-h-96 ${TONES[tone]}`}
    >
      {linkify(text)}
    </pre>
  );

  if (!collapsible) {
    return (
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {body}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={shown}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${shown ? "rotate-90" : ""}`}
          aria-hidden
        />
        {shown ? `Hide ${label}` : `${label} · ${hintFor(value, text)}`}
      </button>
      {shown && body}
    </div>
  );
}
