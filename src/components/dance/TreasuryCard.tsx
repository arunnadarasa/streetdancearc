import { useState } from "react";

export function TreasuryCard({ address }: { address?: string }) {
  const [copied, setCopied] = useState(false);

  if (!address) {
    return (
      <div className="rounded-2xl border border-border bg-card/70 p-5">
        <p className="text-sm text-muted-foreground">
          Run <code className="rounded bg-secondary px-1.5 py-0.5 text-glow">node scripts/bootstrap-circle.mjs</code> first.
        </p>
      </div>
    );
  }

  const addr = address;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-2 p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Treasury</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all rounded bg-background/50 px-2 py-1 text-xs text-foreground/85 sm:text-sm">{addr}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(addr);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/85"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm text-glow hover:underline"
      >
        Fund the treasury with USDC (gas) + EURC + cirBTC on Arc Testnet, then reload. →
      </a>
    </div>
  );
}
