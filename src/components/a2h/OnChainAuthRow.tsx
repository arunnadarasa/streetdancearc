import { ShieldCheck, ShieldAlert } from "lucide-react";

export interface OnChainAuthView {
  authorizer: string;
  authorizerUrl: string;
  hash: string;
  magicValue: string;
  txHash: string | null;
  receiptUrl: string | null;
  valid: boolean;
  expiresAt: string | null;
  detail?: string;
}

const short = (v: string) => `${v.slice(0, 10)}…${v.slice(-6)}`;

/**
 * Compact authorization row for AP2 mandates. On Undeployed this is usually
 * off-chain Ed25519 + optional Compact MandateVault anchor (legacy ERC-1271 paused).
 */
export function OnChainAuthRow({ auth }: { auth: OnChainAuthView }) {
  const Icon = auth.valid ? ShieldCheck : ShieldAlert;
  return (
    <div
      className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${
        auth.valid ? "border-primary/40 bg-primary/10" : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon className={`h-3.5 w-3.5 ${auth.valid ? "text-glow" : "text-amber-300"}`} />
        <span className="font-black uppercase tracking-[0.14em] text-foreground">
          {auth.valid ? "On-chain authorization" : "Mandate authorization"}
        </span>
        <span className="text-muted-foreground">
          {auth.valid ? `verified · ${auth.magicValue}` : "Ed25519 / Compact — Midnight Undeployed"}
        </span>
      </div>
      <p className="mt-1 break-all leading-relaxed text-muted-foreground">
        Digest {short(auth.hash)}
        {auth.expiresAt
          ? ` · valid through ${new Date(auth.expiresAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}`
          : ""}
      </p>
      {auth.receiptUrl && (
        <a
          href={auth.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-semibold text-foreground underline underline-offset-2"
        >
          View approval on indexer
        </a>
      )}
      {!auth.valid && auth.detail ? (
        <p className="mt-1 leading-relaxed text-muted-foreground">{auth.detail}</p>
      ) : null}
    </div>
  );
}
