import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useWallet } from "@/lib/wallet-context";
import { usePayToken } from "@/lib/pay-token";
import { settleOnArc, settlementNote } from "@/lib/settle";
import { TOKENS, formatAmount, isTokenKey, getTokenUsdRate, type TokenKey, type FxRates } from "@/lib/tokens";
import type { Address } from "viem";
import {
  addSpentToday,
  evaluatePolicy,
  loadSpentToday,
  toMandateConstraints,
  type PolicyOutcome,
  type SpendPolicy,
} from "@/lib/spend-policy";
import { fetchFxRates } from "@/lib/fx.functions";


export type StepStatus = "running" | "ok" | "blocked" | "failed" | "waiting";

export interface RunStep {
  id: string;
  title: string;
  detail?: string;
  status: StepStatus;
  payload?: unknown;
  payloadLabel?: string;
  tone?: "neutral" | "green" | "amber" | "red";
  href?: string;
}

export interface AgentOrder {
  sku: string;
  title: string;
  category: string;
  variantId?: string;
  quantity: number;
  listedAmount: number;
  currency: string;
  rightsCid?: string;
}

export function useAgentRun(policy: SpendPolicy) {
  const { authenticated, login, wallets } = useWallet();
  const [payToken] = usePayToken();
  const tokenCfg = TOKENS[payToken];

  const [steps, setSteps] = useState<RunStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [interrupt, setInterrupt] = useState<{ order: AgentOrder; outcome: PolicyOutcome } | null>(
    null,
  );
  const resolveRef = useRef<((approved: boolean) => void) | null>(null);
  const [fx, setFx] = useState<FxRates | null>(null);
  const getFx = useServerFn(fetchFxRates);

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => { mounted = false; };
  }, [getFx]);

  const push = useCallback((s: RunStep) => setSteps((prev) => [...prev, s]), []);
  const patch = useCallback(
    (id: string, next: Partial<RunStep>) =>
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...next } : s))),
    [],
  );

  const answerInterrupt = useCallback((approved: boolean) => {
    resolveRef.current?.(approved);
    resolveRef.current = null;
    setInterrupt(null);
  }, []);

  const run = useCallback(
    async (order: AgentOrder) => {
      setSteps([]);
      setBusy(true);
      try {
        if (!authenticated) {
          push({
            id: "auth",
            title: "Authenticate principal",
            detail: "The agent spends from your Privy embedded wallet — sign in first.",
            status: "waiting",
            tone: "amber",
          });
          await login();
          return;
        }

        // 1 — Discovery
        push({ id: "discover", title: "GET /api/public/agent-card", status: "running" });
        const cardRes = await fetch("/api/public/agent-card");
        const card = await cardRes.json();
        patch("discover", {
          status: "ok",
          detail: `Merchant agent "${card.name}" advertises ${card.skills.length} skills and ${card.extensions.payments.schemes[0]} settlement on ${card.extensions.payments.networks[0]}.`,
          payloadLabel: "agent card · payments extension",
          payload: card.extensions.payments,
        });

        // 2 — Quote (expect 402)
        push({ id: "quote", title: "POST /api/public/purchase → expect 402", status: "running" });
        const body = {
          sku: order.sku,
          variantId: order.variantId,
          quantity: order.quantity,
          listedAmount: order.listedAmount,
          currency: order.currency,
          token: payToken,
          agentId: policy.agentId,
          rightsCid: order.rightsCid,
        };
        const quoteRes = await fetch("/api/public/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const quote = await quoteRes.json();
        if (quoteRes.status !== 402) {
          patch("quote", {
            status: "failed",
            detail: `Expected 402, got ${quoteRes.status}.`,
            payload: quote,
            tone: "red",
          });
          return;
        }
        // The merchant quotes all three stablecoins; take the one the principal chose.
        const requirement =
          quote.accepts.find((a: { symbol?: string }) => a.symbol === tokenCfg.symbol) ??
          quote.accepts[0];
        const chosen: TokenKey = isTokenKey(requirement.symbol) ? requirement.symbol : payToken;
        // Mandate caps are denominated in USD, so unwind the live FX rate.
        const amountUsdc =
          Number(requirement.amount) / 10 ** TOKENS[chosen].decimals / getTokenUsdRate(chosen, fx);
        patch("quote", {
          status: "ok",
          detail: `402 Payment Required — ${requirement.amountFormatted} to ${requirement.payTo.slice(0, 8)}… (≈ $${amountUsdc.toFixed(4)})`,
          payloadLabel: `x402 payment requirement · ${tokenCfg.symbol}`,
          payload: requirement,

        });

        // 3 — Mandate check
        const spentToday = loadSpentToday();
        const outcome = evaluatePolicy(policy, {
          amountUsdc,
          spentTodayUsdc: spentToday,
          category: order.category,
        });
        push({
          id: "policy",
          title: "Evaluate AP2 payment mandate",
          status: outcome.decision === "deny" ? "blocked" : "ok",
          tone: outcome.decision === "allow" ? "green" : outcome.decision === "confirm" ? "amber" : "red",
          detail: outcome.reason,
          payloadLabel: "mandate constraints",
          payload: {
            ...toMandateConstraints(policy),
            evaluation: {
              amount_usdc: Number(amountUsdc.toFixed(6)),
              spent_today_usdc: Number(spentToday.toFixed(6)),
              decision: outcome.decision,
            },
          },
        });
        if (outcome.decision === "deny") return;

        // 4 — Human interrupt when the mandate demands it
        if (outcome.decision === "confirm") {
          push({
            id: "interrupt",
            title: "input-required — human confirmation",
            status: "waiting",
            tone: "amber",
            detail: outcome.reason,
          });
          const approved = await new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
            setInterrupt({ order, outcome });
          });
          if (!approved) {
            patch("interrupt", {
              status: "blocked",
              tone: "red",
              detail: "Principal rejected the spend. Task terminated before any transfer.",
            });
            return;
          }
          patch("interrupt", { status: "ok", tone: "green", detail: "Principal approved the spend." });
        }

        // 5 — Settle on Arc, in whichever stablecoin the principal selected
        push({
          id: "settle",
          title: `Transfer ${requirement.amountFormatted} on Arc`,
          status: "running",
        });
        const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
        if (!embedded?.address) throw new Error("No embedded wallet available.");
        const result = await settleOnArc(
          embedded as Parameters<typeof settleOnArc>[0],
          payToken,
          requirement.payTo as Address,
          BigInt(requirement.amount),
        );
        const { hash, from } = result;
        patch("settle", {
          status: "ok",
          tone: "green",
          detail: settlementNote(payToken),
          href: result.explorer,
          payloadLabel: "settlement",
          payload: {
            txHash: hash,
            from,
            to: requirement.payTo,
            token: tokenCfg.symbol,
            asset: requirement.asset,
            amount: requirement.amount,
            amountFormatted: formatAmount(BigInt(requirement.amount), payToken),
          },
        });


        // 6 — Re-present with X-PAYMENT
        push({ id: "verify", title: "POST /api/public/purchase with X-PAYMENT", status: "running" });
        const xPayment = btoa(JSON.stringify({ txHash: hash, from, nonce: requirement.nonce }));
        const paidRes = await fetch("/api/public/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-PAYMENT": xPayment },
          body: JSON.stringify(body),
        });
        const receipt = await paidRes.json();
        if (!paidRes.ok) {
          patch("verify", {
            status: "failed",
            tone: "red",
            detail: `Merchant rejected the payment (${paidRes.status}).`,
            payload: receipt,
          });
          return;
        }
        addSpentToday(amountUsdc);
        patch("verify", {
          status: "ok",
          tone: "green",
          detail: `Merchant verified the transfer on Arc and released order ${receipt.order_id}.`,
          payloadLabel: "fulfilment object",
          payload: receipt,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        push({ id: `err-${Date.now()}`, title: "Run failed", status: "failed", tone: "red", detail: msg });
      } finally {
        setBusy(false);
        resolveRef.current = null;
        setInterrupt(null);
      }
    },
    [authenticated, login, patch, payToken, policy, push, tokenCfg.symbol, wallets, fx],
  );

  return { steps, busy, run, interrupt, answerInterrupt };
}
