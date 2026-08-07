import { useState } from "react";
import {
  ArrowDownToLine,
  BadgeCheck,
  ChevronDown,
  Clock,
  Loader2,
  ShieldQuestion,
  Tag,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { JsonBlock } from "@/components/gx/JsonBlock";
import { approvePayout, claimOffer, renewMandate } from "@/lib/a2h.functions";
import { usePayToken } from "@/lib/pay-token";
import { setMandateExpiry } from "@/components/a2h/a2h-feed";
import { OnChainAuthRow, type OnChainAuthView } from "./OnChainAuthRow";
import type { A2hMessage } from "./a2h-feed";

const KIND: Record<
  A2hMessage["kind"],
  { icon: typeof Tag; label: string; ring: string; tint: string }
> = {
  payout: {
    icon: ArrowDownToLine,
    label: "Payout settled on Arc",
    ring: "border-primary/40",
    tint: "text-glow",
  },
  approval: {
    icon: ShieldQuestion,
    label: "Approval requested",
    ring: "border-amber-500/40",
    tint: "text-amber-300",
  },
  offer: { icon: Tag, label: "Offer pushed", ring: "border-border", tint: "text-glow" },
  mandate: {
    icon: Clock,
    label: "Mandate expiring",
    ring: "border-border",
    tint: "text-muted-foreground",
  },
};

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export function InboxCard({
  msg,
  address,
  onSettled,
}: {
  msg: A2hMessage;
  address?: string;
  onSettled?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [acted, setActed] = useState<"declined" | "claimed" | "dismissed" | "deferred" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [renewed, setRenewed] = useState<{
    expiresAt: string;
    mandate: unknown;
    onChainAuth?: OnChainAuthView;
  } | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | {
        ok: true;
        receiptUrl: string;
        value: string;
        token: string;
        mandate: unknown;
        onChainAuth?: OnChainAuthView;
      }
    | { ok: false; detail: string }
    | null
  >(null);
  const [claimed, setClaimed] = useState<{
    claimCode: string;
    value: string;
    token: string;
    receiptUrl: string;
    claim: unknown;
    onChainAuth?: OnChainAuthView;
  } | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const approve = useServerFn(approvePayout);
  const claim = useServerFn(claimOffer);
  const renew = useServerFn(renewMandate);
  const [payToken] = usePayToken();
  const k = KIND[msg.kind];
  const Icon = k.icon;

  async function runRenew() {
    if (!address) return;
    setBusy(true);
    setRenewError(null);
    try {
      const res = await renew({ data: { address, token: payToken, days: 90 } });
      setMandateExpiry(res.expiresAt);
      setRenewed({
        expiresAt: res.expiresAt,
        mandate: res.mandate,
        onChainAuth: res.onChainAuth as OnChainAuthView,
      });
      setOpen(true);
    } catch (e) {
      setRenewError(
        e instanceof Error && e.message.includes("missing_secret")
          ? "Mandate signing key is not configured on this deployment."
          : "Could not renew the mandate right now — try again.",
      );
    } finally {
      setBusy(false);
    }
  }


  async function runClaim() {
    if (!address || !msg.amount) return;
    setBusy(true);
    setClaimError(null);
    try {
      const res = await claim({
        data: {
          address,
          token: msg.amount.token,
          offerId: msg.id,
          title: msg.title,
          value: msg.amount.value,
        },
      });
      if (res.ok) {
        setClaimed({
          claimCode: res.claimCode,
          value: res.value,
          token: res.token,
          receiptUrl: res.receiptUrl,
          claim: res.claim,
          onChainAuth: res.onChainAuth as OnChainAuthView,
        });
        setOpen(true);
        await onSettled?.();
      } else {
        setClaimError(res.detail);
      }
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Could not claim the offer — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function runApproval() {
    if (!msg.approval || !address) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await approve({
        data: {
          address,
          token: msg.amount?.token ?? "USDC",
          moveCid: msg.approval.moveCid,
          usd: msg.approval.usd,
        },
      });
      if (res.ok) {
        setResult({
          ok: true,
          receiptUrl: res.receiptUrl,
          value: res.value,
          token: res.token,
          mandate: res.mandate,
          onChainAuth: res.onChainAuth as OnChainAuthView,
        });
        await onSettled?.();
      } else {
        setResult({ ok: false, detail: res.detail });
      }
    } catch (e) {
      setResult({ ok: false, detail: e instanceof Error ? e.message : "payout_failed" });
    } finally {
      setBusy(false);
    }
  }

  const receipt = result?.ok ? result.receiptUrl : (claimed?.receiptUrl ?? msg.receiptUrl);

  return (
    <article className={`min-w-0 rounded-2xl border bg-card/70 p-4 sm:p-5 ${k.ring}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background/60">
          <Icon className={`h-4 w-4 ${k.tint}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${k.tint}`}>
              {result?.ok
                ? "Payout settled on Arc"
                : claimed
                  ? "Offer claimed on Arc"
                  : renewed
                    ? "Mandate renewed"
                    : k.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {msg.agent} &middot; {ago(msg.at)}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-black leading-snug text-foreground sm:text-base">
            {msg.title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{msg.body}</p>

          {msg.amount && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-bold text-foreground">
              {msg.amount.value} {msg.amount.token}
            </p>
          )}

          {result && !result.ok && (
            <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive-foreground">
              Payout failed: {result.detail}
            </p>
          )}

          {claimError && (
            <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive-foreground">
              Claim failed: {claimError}
            </p>
          )}

          {claimed && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold text-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-glow" />
              Claimed — code {claimed.claimCode} &middot; {claimed.value} {claimed.token}
            </p>
          )}

          {renewError && (
            <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive-foreground">
              {renewError}
            </p>
          )}

          {renewed && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold text-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-glow" />
              Renewed — valid through{" "}
              {new Date(renewed.expiresAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}

          {result?.ok && result.onChainAuth ? <OnChainAuthRow auth={result.onChainAuth} /> : null}
          {renewed?.onChainAuth ? <OnChainAuthRow auth={renewed.onChainAuth} /> : null}
          {claimed?.onChainAuth ? <OnChainAuthRow auth={claimed.onChainAuth} /> : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {receipt && (
              <a
                href={receipt}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-primary/20"
              >
                <BadgeCheck className="h-3.5 w-3.5 text-glow" />
                View receipt on Arcscan
              </a>
            )}

            {msg.registryUrl && (
              <a
                href={msg.registryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                Rights registry
              </a>
            )}

            {msg.kind === "approval" && !acted && !result?.ok && (
              <>
                <button
                  onClick={() => void runApproval()}
                  disabled={busy || !address}
                  className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-glow px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {busy ? "Sending on Arc…" : address ? "Approve payout" : "Connect wallet first"}
                </button>
                <button
                  onClick={() => setActed("declined")}
                  disabled={busy}
                  className="rounded-full border border-border px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Decline
                </button>
              </>
            )}

            {msg.kind === "offer" && !acted && !claimed && (
              <>
                <button
                  onClick={() => void runClaim()}
                  disabled={busy || !address}
                  className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-glow px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {busy ? "Claiming on Arc…" : address ? "Claim offer" : "Connect wallet first"}
                </button>
                <button
                  onClick={() => setActed("dismissed")}
                  disabled={busy}
                  className="rounded-full border border-border px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </>
            )}

            {msg.kind === "mandate" && !acted && !renewed && (
              <>
                <button
                  onClick={() => void runRenew()}
                  disabled={busy || !address}
                  className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-glow px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {busy ? "Signing mandate…" : address ? "Renew mandate" : "Connect wallet first"}
                </button>
                <button
                  onClick={() => setActed("deferred")}
                  disabled={busy}
                  className="rounded-full border border-border px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Not now
                </button>
              </>
            )}



            {acted && (
              <span className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                Recorded on the thread: {acted}
              </span>
            )}

            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
              {open ? "Hide protocol" : "Show protocol"}
            </button>
          </div>

          {open && (
            <div className="mt-3 space-y-3">
              <JsonBlock
                label="A2A 0.3 · message/send (agent → human)"
                value={msg.envelope}
                tone={msg.kind === "approval" ? "amber" : "green"}
              />
              {result?.ok && (
                <JsonBlock
                  label="AP2 payout mandate · Ed25519 signed"
                  value={result.mandate}
                  tone="green"
                />
              )}
              {claimed && (
                <JsonBlock
                  label="AP2 offer claim · Ed25519 signed, logged on Arc"
                  value={claimed.claim}
                  tone="green"
                />
              )}
              {renewed && (
                <JsonBlock
                  label="AP2 payout mandate · renewed, Ed25519 signed"
                  value={renewed.mandate}
                  tone="green"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
