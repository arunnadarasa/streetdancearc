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

export function JsonBlock({ label, value, tone = "neutral" }: JsonBlockProps) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <pre
        className={`max-h-72 w-full min-w-0 max-w-full overflow-y-auto whitespace-pre-wrap break-all rounded-xl border p-3 font-mono text-[11px] leading-relaxed sm:max-h-96 ${TONES[tone]}`}
      >
        {linkify(text)}
      </pre>
    </div>
  );
}
