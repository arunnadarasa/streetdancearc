import { INDEXER_URL, NETWORK_ID, PROOF_SERVER_URL } from "@/lib/tokens";
import { CONTRACTS, shortAddress } from "@/lib/contracts";

/** Midnight Local Undeployed stack summary — replaces the old Circle treasury card. */
export function TreasuryCard({ address: _address }: { address?: string }) {
  const registry = CONTRACTS.find((c) => c.key === "registry");
  const musdc = CONTRACTS.find((c) => c.key === "musdc");

  return (
    <div className="rounded-2xl border border-border bg-linear-to-br from-surface to-surface-2 p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Midnight Local Undeployed
      </p>
      <h3 className="mt-1 text-lg font-black text-foreground">Local stack</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Compact MoveRegistry + experimental mUSDC. Writes use the genesis server-append wallet —
        Lace is optional for connect UX. Receipts live on the indexer.
      </p>

      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-muted-foreground">Network</dt>
          <dd className="font-mono font-semibold text-foreground">{NETWORK_ID}</dd>
        </div>
        {registry?.address ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">MoveRegistry</dt>
            <dd className="font-mono text-foreground">{shortAddress(registry.address, 8, 6)}</dd>
          </div>
        ) : null}
        {musdc?.address ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">MidnightUSDC</dt>
            <dd className="font-mono text-foreground">{shortAddress(musdc.address, 8, 6)}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-muted-foreground">Proof server</dt>
          <dd className="break-all font-mono text-foreground">{PROOF_SERVER_URL}</dd>
        </div>
      </dl>

      <a
        href={INDEXER_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-sm text-glow hover:underline"
      >
        Open indexer GraphQL →
      </a>
    </div>
  );
}
