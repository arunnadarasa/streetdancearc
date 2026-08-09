import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

/** Pull a 64-char hex hash from an indexer URL, Arcscan URL, or raw hash. */
function hashFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const evm = url.match(/0x([0-9a-fA-F]{64})/i);
  if (evm) return `0x${evm[1]}`;
  const bare = url.match(/(?:tx=|#tx=|\/tx\/)([0-9a-fA-F]{64})/i);
  if (bare) return bare[1];
  if (/^[0-9a-fA-F]{64}$/.test(url)) return url;
  return undefined;
}

function shortHash(h: string): string {
  const hex = h.replace(/^0x/i, "");
  return `${hex.slice(0, 8)}…${hex.slice(-6)}`;
}

/** Receipt-first indexer link with a copy-hash affordance. */
export function ReceiptButton({ href, label }: { href: string; label?: string }) {
  const hash = hashFromUrl(href);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash.replace(/^0x/i, ""));
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
        <span className="truncate">{label ?? "View on indexer"}</span>
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
