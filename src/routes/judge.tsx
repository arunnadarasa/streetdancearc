import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  Handshake,
  Inbox,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { Header } from "@/components/dance/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Section, SectionHead } from "@/components/layout/Section";
import { JsonBlock } from "@/components/gx/JsonBlock";
import { useWallet } from "@/lib/wallet-context";
import { usePayToken } from "@/lib/pay-token";
import { getPublicConfig } from "@/lib/config.functions";
import { fetchX402Challenge } from "@/lib/judge.functions";
import { pushPayout } from "@/lib/a2h.functions";
import { ARC_EXPLORER } from "@/lib/tokens";

const TITLE = "Judge run · StreetRail — all four modes on Arc";
const DESCRIPTION =
  "A guided four-step run through StreetRail's H2H, H2A, A2A and A2H modes on Circle's Arc Testnet, with live x402 challenges and on-chain Arcscan receipts.";

export const Route = createFileRoute("/judge")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: JudgePage,
});

/** Plays needed to cross the $0.50 nanopayment batch threshold at $0.001/play. */
const JUDGE_PLAYS = 600;
const JUDGE_MOVE = "krump-2024-w32";

type StepState = "idle" | "running" | "done" | "failed";

function StepShell({
  index,
  icon,
  title,
  mode,
  blurb,
  children,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  mode: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">Step {index}</span>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-primary">
              {mode}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold sm:text-xl">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
          <div className="mt-4 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function JudgePage() {
  const wallet = useWallet();
  const [payToken] = usePayToken();
  const [treasury, setTreasury] = useState<string>("");

  const getConfig = useServerFn(getPublicConfig);
  const runChallenge = useServerFn(fetchX402Challenge);
  const runPayout = useServerFn(pushPayout);

  useEffect(() => {
    let mounted = true;
    void getConfig({ data: undefined } as never)
      .then((cfg: { treasuryAddress?: string }) => {
        if (mounted) setTreasury(cfg?.treasuryAddress ?? "");
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [getConfig]);

  const payee =
    wallet.wallets[0]?.address ?? wallet.user?.wallet?.address ?? treasury ?? "";

  // --- Step 3: live x402 handshake ---------------------------------------
  const [a2aState, setA2aState] = useState<StepState>("idle");
  const [a2aResult, setA2aResult] = useState<unknown>(null);
  const [a2aError, setA2aError] = useState<string | null>(null);

  const doA2a = useCallback(async () => {
    setA2aState("running");
    setA2aError(null);
    try {
      const res = await runChallenge({ data: { token: payToken } });
      setA2aResult(res.challenge ?? res);
      if (res.ok) setA2aState("done");
      else {
        setA2aState("failed");
        setA2aError(res.detail ?? "The merchant did not return a payment challenge.");
      }
    } catch (e) {
      setA2aState("failed");
      setA2aError(e instanceof Error ? e.message : "The handshake failed.");
    }
  }, [runChallenge, payToken]);

  // --- Step 4: real on-chain A2H payout ----------------------------------
  const [a2hState, setA2hState] = useState<StepState>("idle");
  const [a2hResult, setA2hResult] = useState<unknown>(null);
  const [a2hTx, setA2hTx] = useState<string | null>(null);
  const [a2hError, setA2hError] = useState<string | null>(null);

  const doA2h = useCallback(async () => {
    if (!payee) {
      setA2hError("No payout address yet — connect a wallet or wait for the treasury to load.");
      setA2hState("failed");
      return;
    }
    setA2hState("running");
    setA2hError(null);
    setA2hTx(null);
    try {
      const res = (await runPayout({
        data: { address: payee, token: payToken, moveCid: JUDGE_MOVE, plays: JUDGE_PLAYS },
      })) as { ok?: boolean; txHash?: string; detail?: string; reason?: string };
      setA2hResult(res);
      const hash = typeof res?.txHash === "string" ? res.txHash : null;
      setA2hTx(hash);
      if (res?.ok) setA2hState("done");
      else {
        setA2hState("failed");
        setA2hError(res?.detail ?? res?.reason ?? "The payout did not settle.");
      }
    } catch (e) {
      setA2hState("failed");
      setA2hError(e instanceof Error ? e.message : "The payout failed.");
    }
  }, [runPayout, payee, payToken]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Section tone="base" lines>
          <SectionHead
            eyebrow="For judges"
            title="Four modes, one run"
            copy="Merch commerce first, agent rails underneath. Steps 1 and 2 are signed by your own wallet. Steps 3 and 4 run agent-side against Arc Testnet right here — no wallet needed."
          />

          <div className="mt-8 space-y-4">
            <StepShell
              index={1}
              mode="H2H"
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Buy streetwear with stablecoins"
              blurb="The human path: browse the drop, pick USDC, EURC or cirBTC, and pay from your wallet. USDC is the gas token, so there is no second asset to hold."
            >
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Open the shop <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-muted-foreground">
                Requires a funded Arc Testnet wallet. Top up at faucet.circle.com.
              </p>
            </StepShell>

            <StepShell
              index={2}
              mode="H2A"
              icon={<Bot className="h-5 w-5" />}
              title="Delegate the purchase to an agent"
              blurb="You set a spend policy, the agent shops, quotes and settles under it — pausing for your approval whenever a line crosses the confirmation threshold."
            >
              <a
                href="/?mode=h2a"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary/60"
              >
                Run the agent under policy <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs text-muted-foreground">
                Settlement is signed by your wallet; the mandate is AP2-shaped.
              </p>
            </StepShell>

            <StepShell
              index={3}
              mode="A2A"
              icon={<Handshake className="h-5 w-5" />}
              title="Live x402 payment challenge"
              blurb="A buyer agent posts an order to StreetRail's merchant endpoint and gets back a machine-readable 402 challenge: exact amount, CAIP-19 asset, and where to pay on Arc."
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={doA2a}
                  disabled={a2aState === "running"}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {a2aState === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : a2aState === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : null}
                  {a2aState === "done" ? "Challenge received" : `Request a ${payToken} quote`}
                </button>
                <a
                  href="/?mode=a2a"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary/60"
                >
                  Watch two agents negotiate <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              {a2aError ? <p className="text-xs text-red-300">{a2aError}</p> : null}
              {a2aResult ? (
                <JsonBlock
                  label="HTTP 402 · payment required"
                  value={a2aResult}
                  tone={a2aState === "done" ? "green" : "amber"}
                />
              ) : null}
            </StepShell>

            <StepShell
              index={4}
              mode="A2H"
              icon={<Inbox className="h-5 w-5" />}
              title="Agent pays a choreographer on Arc"
              blurb={`A rights agent accrues ${JUDGE_PLAYS} plays at $0.001 each off-chain, crosses the $0.50 batch threshold, then settles once on Arc from the Circle treasury and logs it to the rights registry.`}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={doA2h}
                  disabled={a2hState === "running"}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {a2hState === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : a2hState === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : null}
                  {a2hState === "running"
                    ? "Settling on Arc…"
                    : a2hState === "done"
                      ? "Payout settled"
                      : "Settle a real payout"}
                </button>
                <a
                  href="/?mode=a2h"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary/60"
                >
                  Open the payout inbox <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <p className="break-all text-xs text-muted-foreground">
                Paying to {payee ? `${payee.slice(0, 10)}…${payee.slice(-6)}` : "…"}{" "}
                {wallet.wallets[0]?.address ? "(your wallet)" : "(treasury, connect a wallet to redirect)"}
              </p>
              {a2hError ? <p className="text-xs text-red-300">{a2hError}</p> : null}
              {a2hTx ? (
                <a
                  href={`${ARC_EXPLORER}/tx/${a2hTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  View the receipt on Arcscan <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              {a2hResult ? <JsonBlock label="Settlement" value={a2hResult} tone={a2hState === "done" ? "green" : "amber"} /> : null}
            </StepShell>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
