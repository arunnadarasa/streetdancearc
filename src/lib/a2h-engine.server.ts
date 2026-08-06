// A2H orchestration: cap checks, FX, real treasury payouts, signed AP2 receipts.
// Kept out of a2h.functions.ts because server-fn splitting deletes siblings.

import { getFxRates } from "@/lib/fx.server";
import { convertFromUsd, getTokenUsdRate } from "@/lib/fx";
import { TOKENS, ARC_EXPLORER, type TokenKey } from "@/lib/tokens";
import { signMandate } from "@/lib/mandate-sign.server";
import {
  DAILY_CAP_USD,
  PAYOUT_UNIT_USD,
  PER_PAYOUT_CAP_USD,
  REGISTRY,
  readPayouts,
  sendPayout,
  type OnChainPayout,
} from "@/lib/a2h.server";

const ARC_CAIP2 = "eip155:5042002";

function places(token: TokenKey) {
  return TOKENS[token].decimals === 8 ? 8 : 6;
}

function usdOf(p: OnChainPayout, fx: Awaited<ReturnType<typeof getFxRates>>) {
  return Number(p.value) / getTokenUsdRate(p.token, fx);
}

export async function runListPayouts(address?: string) {
  const fx = await getFxRates();
  let payouts: OnChainPayout[] = [];
  let error: string | null = null;
  let degraded = false;
  try {
    const history = await readPayouts(address);
    payouts = history.payouts;
    degraded = history.degraded;
    error = history.degraded ? history.detail : null;
  } catch (e) {
    degraded = true;
    error = e instanceof Error ? e.message : "registry_read_failed";
  }
  const dayAgo = Date.now() / 1000 - 86_400;
  const spentTodayUsd = payouts
    .filter((p) => p.atSeconds > dayAgo)
    .reduce((sum, p) => sum + usdOf(p, fx), 0);

  return {
    payouts: payouts.map((p) => ({ ...p, receiptUrl: `${ARC_EXPLORER}/tx/${p.txHash}` })),
    registry: REGISTRY,
    registryUrl: `${ARC_EXPLORER}/address/${REGISTRY}`,
    spentTodayUsd,
    caps: { perPayoutUsd: PER_PAYOUT_CAP_USD, dailyUsd: DAILY_CAP_USD },
    fx,
    degraded,
    error,
  };
}


interface SettleInput {
  address: string;
  token: TokenKey;
  moveCid: string;
  usd: number;
  plays?: number;
  approved?: boolean;
}

async function settle(input: SettleInput) {
  const fx = await getFxRates();
  const value = convertFromUsd(input.usd, input.token, fx).toFixed(places(input.token));

  if (!input.approved && input.usd > PER_PAYOUT_CAP_USD) {
    return {
      ok: false as const,
      reason: "amount_exceeds_per_payout_cap",
      detail: `${input.usd.toFixed(2)} USD is over the ${PER_PAYOUT_CAP_USD.toFixed(2)} USD per-payout cap.`,
      value,
      token: input.token,
    };
  }

  try {
    const result = await sendPayout({
      to: input.address,
      token: input.token,
      amount: value,
      moveCid: input.moveCid,
    });

    const mandate = {
      ap2Version: "0.1",
      type: "PayoutMandate",
      payoutId: `po_${result.transferTx.slice(2, 14)}`,
      agent: "did:web:streetrail.lovable.app#rights-agent",
      recipient: { address: input.address, network: ARC_CAIP2, chainId: 5042002 },
      amount: { value, asset: input.token, usd: input.usd.toFixed(4) },
      move: { cid: input.moveCid, plays: input.plays ?? null },
      authorization: input.approved ? "human_approved" : "standing_mandate",
      proof: [
        { scheme: "evm-tx", role: "transfer", txHash: result.transferTx, network: ARC_CAIP2 },
        { scheme: "evm-tx", role: "registry-log", txHash: result.registryTx, network: ARC_CAIP2 },
      ],
      issuedAt: new Date().toISOString(),
    };

    return {
      ok: true as const,
      ...result,
      receiptUrl: `${ARC_EXPLORER}/tx/${result.transferTx}`,
      registryUrl: `${ARC_EXPLORER}/tx/${result.registryTx}`,
      mandate: { ...mandate, signature: signMandate(mandate) },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "payout_failed";
    return {
      ok: false as const,
      reason: message.split(":")[0] ?? "payout_failed",
      detail: message,
      value,
      token: input.token,
    };
  }
}

export async function runPushPayout(data: {
  address: string;
  token: TokenKey;
  moveCid: string;
  plays: number;
}) {
  return settle({ ...data, usd: PAYOUT_UNIT_USD * data.plays });
}

export async function runApprovePayout(data: {
  address: string;
  token: TokenKey;
  moveCid: string;
  usd: number;
}) {
  return settle({ ...data, approved: true });
}
