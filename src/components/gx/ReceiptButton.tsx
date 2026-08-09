import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

function hashFromUrl(url?: string): string | undefined {
  return url?.match(/0x[0-9a-fA-F]{64}/)?.[0];
}

function shortHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

/** Receipt-first Arcscan link with a copy-hash affordance. */
export function ReceiptButton({ href, label }: { href: string; label?: string }) {
  const hash = hashFromUrl(href);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the link still works */
    }
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-w-0 items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-3.5 py-2 text-xs font-black text-foreground transition hover:bg-primary/25"
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-glow" />
        <span className="truncate">{label ?? "View receipt on Arcscan"}</span>
        {hash && (
          <span className="hidden font-mono text-[11px] font-bold text-muted-foreground sm:inline">
            {shortHash(hash)}
          </span>
        )}
      </a>
      {hash && (
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-2 text-[11px] font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy hash"}
        </button>
      )}
    </div>
  );
}
