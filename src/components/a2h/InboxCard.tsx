import { useState } from "react";
import {
  ArrowDownToLine,
  BadgeCheck,
  ChevronDown,
  Clock,
  ShieldQuestion,
  Tag,
} from "lucide-react";
import { JsonBlock } from "@/components/gx/JsonBlock";
import type { A2hMessage } from "./a2h-feed";

const KIND: Record<
  A2hMessage["kind"],
  { icon: typeof Tag; label: string; ring: string; tint: string }
> = {
  payout: {
    icon: ArrowDownToLine,
    label: "Payout pushed",
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
  const mins = Math.max(
    1,
    Math.round((Date.parse("2026-08-05T08:00:00Z") - Date.parse(iso)) / 60000),
  );
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export function InboxCard({ msg }: { msg: A2hMessage }) {
  const [open, setOpen] = useState(false);
  const [acted, setActed] = useState<"approved" | "declined" | "claimed" | "dismissed" | null>(
    null,
  );
  const k = KIND[msg.kind];
  const Icon = k.icon;

  return (
    <article className={`min-w-0 rounded-2xl border bg-card/70 p-4 sm:p-5 ${k.ring}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background/60">
          <Icon className={`h-4 w-4 ${k.tint}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${k.tint}`}>
              {k.label}
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {msg.receiptUrl && (
              <a
                href={msg.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-primary/20"
              >
                <BadgeCheck className="h-3.5 w-3.5 text-glow" />
                View receipt on Arcscan
              </a>
            )}

            {msg.kind === "approval" && !acted && (
              <>
                <button
                  onClick={() => setActed("approved")}
                  className="rounded-full bg-linear-to-r from-primary to-glow px-4 py-1.5 text-[11px] font-bold text-primary-foreground"
                >
                  Approve payout
                </button>
                <button
                  onClick={() => setActed("declined")}
                  className="rounded-full border border-border px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Decline
                </button>
              </>
            )}

            {msg.kind === "offer" && !acted && (
              <>
                <button
                  onClick={() => setActed("claimed")}
                  className="rounded-full bg-linear-to-r from-primary to-glow px-4 py-1.5 text-[11px] font-bold text-primary-foreground"
                >
                  Claim offer
                </button>
                <button
                  onClick={() => setActed("dismissed")}
                  className="rounded-full border border-border px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Dismiss
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
            <div className="mt-3">
              <JsonBlock
                label="A2A 0.3 · message/send (agent → human)"
                value={msg.envelope}
                tone={msg.kind === "approval" ? "amber" : "green"}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
