import { useState } from "react";

export function TreasuryCard({ address }: { address?: string }) {
  const [copied, setCopied] = useState(false);

  if (!address) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
        <p className="text-sm text-neutral-300">
          Run <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-[#1DB954]">node scripts/bootstrap-circle.mjs</code> first.
        </p>
      </div>
    );
  }

  const addr = address;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
      <p className="text-xs uppercase tracking-widest text-neutral-500">Treasury</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="truncate rounded bg-black/40 px-2 py-1 text-sm text-neutral-200">{addr}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(addr);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-md bg-[#1DB954] px-3 py-1 text-xs font-semibold text-black hover:bg-[#1ed760]"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm text-[#1DB954] hover:underline"
      >
        Fund the treasury with USDC (gas) + EURC + cirBTC on Arc Testnet, then reload. →
      </a>
    </div>
  );
}
