import { useState } from "react";
import { BadgeCheck, Check, Copy, ExternalLink, FileCode2 } from "lucide-react";
import { ARC_CHAIN_CAPTION, CONTRACTS, shortAddress } from "@/lib/contracts";

/** Card list of every deployed StreetRail contract with Arcscan links. */
export function ContractsPanel({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      setTimeout(() => setCopied((c) => (c === address ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {CONTRACTS.map((c) => (
        <div key={c.key} className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="flex items-start gap-2">
            <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{c.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.blurb}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {c.standards.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
              >
                {s}
              </span>
            ))}
            {c.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                <BadgeCheck className="h-3 w-3" /> Verified on Arcscan
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
              {shortAddress(c.address)}
            </code>
            <button
              type="button"
              onClick={() => void copy(c.address)}
              aria-label={`Copy ${c.name} address`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {copied === c.address ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied === c.address ? "Copied" : "Copy"}
            </button>
            <a
              href={c.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-primary underline underline-offset-4"
            >
              Arcscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ))}
      <p className="px-1 text-[10px] text-muted-foreground">{ARC_CHAIN_CAPTION}</p>
    </div>
  );
}
