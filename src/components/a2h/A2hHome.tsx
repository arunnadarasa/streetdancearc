import { Inbox, ShieldCheck } from "lucide-react";
import { JsonBlock } from "@/components/gx/JsonBlock";
import { InboxCard } from "./InboxCard";
import { A2H_FEED, RIGHTS_REGISTRY, mandateFor, redenominate } from "./a2h-feed";
import { ARC_EXPLORER, TOKENS } from "@/lib/tokens";
import { usePayToken } from "@/lib/pay-token";

export function A2hHome() {
  const [payToken] = usePayToken();
  const mandate = mandateFor(payToken);
  const feed = redenominate(A2H_FEED, payToken);
  const pending = feed.filter((m) => m.kind === "approval").length;

  const CAPS = [
    { k: "Settle token", v: TOKENS[payToken].symbol },
    { k: "Per payout", v: `${mandate.per_payout_cap} ${payToken}` },
    { k: "Daily cap", v: `${mandate.daily_cap} ${payToken}` },
    { k: "Expires", v: "12 Aug 2026" },
  ];


  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/30 bg-linear-to-br from-primary/15 via-surface to-black p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-glow">
          Generative Experience &middot; agent-to-human
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-foreground sm:text-4xl">
          The agent starts.
          <br />
          You just get paid.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          A2H flips the direction. Nobody opens an app. The Rights Agent watches the rail, sees
          your move earn, pushes the {payToken} and drops the receipt in your inbox. When it wants to
          act outside its mandate, it asks — and waits.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card/70 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-glow" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-glow">
              Standing authorization
            </p>
            <h3 className="mt-1 text-lg font-black text-foreground">
              What agents may push to you without asking
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The same AP2 mandate shape H2A uses for spend guardrails, pointed the other way:
              you pre-sign <em>receive and notify</em> instead of <em>spend</em>.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border/60 sm:grid-cols-4">
              {CAPS.map((c) => (
                <div key={c.k} className="bg-background/70 px-3 py-3">
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {c.k}
                  </dt>
                  <dd className="mt-1 text-sm font-black text-foreground">{c.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <JsonBlock label="AP2 payout mandate" value={mandate} tone="green" />
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Payouts reference the rights registry at{" "}
              <a
                href={`${ARC_EXPLORER}/address/${RIGHTS_REGISTRY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-glow underline decoration-glow/50 underline-offset-2"
              >
                {RIGHTS_REGISTRY.slice(0, 10)}…{RIGHTS_REGISTRY.slice(-6)}
              </a>{" "}
              on Arc Testnet.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Inbox className="h-4 w-4 text-glow" />
          <h3 className="text-lg font-black text-foreground">Payout inbox</h3>
          {pending > 0 && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
              {pending} needs you
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Every entry was initiated by an agent. Nothing here started with a click.
        </p>
        <div className="space-y-3">
          {feed.map((m) => (
            <InboxCard key={m.id} msg={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
