// A2H orchestration: nanopayment accrual, batch settlement on Arc, cap checks,
// FX and signed AP2 receipts.
// Kept out of a2h.functions.ts because server-fn splitting deletes siblings.

import { getFxRates } from "@/lib/fx.server";
import { convertFromUsd, getTokenUsdRate, microToUsd, usdToMicro } from "@/lib/fx";
import { TOKENS, ARC_EXPLORER, type TokenKey } from "@/lib/tokens";
import { signMandate } from "@/lib/mandate-sign.server";
import {
  accrue,
  accrualKey,
  closeAccrual,
  getAccrual,
  listAccruals,
  type Accrual,
} from "@/lib/nanoledger.server";
import {
  BATCH_THRESHOLD_USD,
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

function batchView(a: Accrual) {
  return {
    key: a.key,
    batchId: a.batchId,
    moveCid: a.moveCid,
    token: a.token,
    plays: a.plays,
    microUsd: a.microUsd,
    usd: microToUsd(a.microUsd),
    count: a.items.length,
    thresholdUsd: BATCH_THRESHOLD_USD,
    ready: microToUsd(a.microUsd) >= BATCH_THRESHOLD_USD,
    progress: Math.min(1, microToUsd(a.microUsd) / BATCH_THRESHOLD_USD),
    openedAt: a.openedAt,
  };
}

export type BatchView = ReturnType<typeof batchView>;

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
  } catch {
    degraded = true;
    error = "Registry history could not be read from the RPC provider right now.";
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
    batchThresholdUsd: BATCH_THRESHOLD_USD,
    fx,
    degraded,
    error,
  };
}

export function runListAccruals(address?: string) {
  return {
    batches: listAccruals(address).map(batchView),
    unitUsd: PAYOUT_UNIT_USD,
    thresholdUsd: BATCH_THRESHOLD_USD,
  };
}

interface SettleInput {
  address: string;
  token: TokenKey;
  moveCid: string;
  usd: number;
  plays?: number;
  approved?: boolean;
  /** Accrued nanopayments this single transaction settles. */
  nanopayments?: { plays: number; microUsd: number; atSeconds: number }[];
  batchId?: string;
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
      batch: input.batchId
        ? {
            batchId: input.batchId,
            count: input.nanopayments?.length ?? 0,
            scheme: "nanopayment-accrual",
            nanopayments: (input.nanopayments ?? []).map((n) => ({
              plays: n.plays,
              usd: microToUsd(n.microUsd).toFixed(6),
              at: new Date(n.atSeconds * 1000).toISOString(),
            })),
          }
        : null,
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

/** Record plays as a nanopayment. No chain write — this is the cheap path. */
export function runAccruePayout(data: {
  address: string;
  token: TokenKey;
  moveCid: string;
  plays: number;
}) {
  const batch = accrue({
    address: data.address,
    moveCid: data.moveCid,
    token: data.token,
    plays: data.plays,
    microUsd: usdToMicro(PAYOUT_UNIT_USD * data.plays),
  });
  return { ok: true as const, batch: batchView(batch) };
}

/** Settle one open batch in a single Arc transfer + registry log. */
export async function runSettleBatch(data: {
  address: string;
  token: TokenKey;
  moveCid: string;
  approved?: boolean;
}) {
  const key = accrualKey(data.address, data.moveCid, data.token);
  const batch = getAccrual(key);
  if (!batch || batch.microUsd <= 0) {
    return { ok: false as const, reason: "nothing_accrued", detail: "No nanopayments are waiting for this move." };
  }

  const usd = microToUsd(batch.microUsd);
  const snapshot = batch.items.map((i) => ({
    plays: i.plays,
    microUsd: i.microUsd,
    atSeconds: i.atSeconds,
  }));

  const result = await settle({
    address: data.address,
    token: data.token,
    moveCid: data.moveCid,
    usd,
    plays: batch.plays,
    ...(data.approved === undefined ? {} : { approved: data.approved }),
    nanopayments: snapshot,
    batchId: batch.batchId,
  });

  if (result.ok) closeAccrual(key);
  return { ...result, batchId: batch.batchId, count: snapshot.length, plays: batch.plays, usd };
}

/**
 * Sweep entry point: always accrues, and settles automatically once the open
 * batch crosses the threshold.
 */
export async function runPushPayout(data: {
  address: string;
  token: TokenKey;
  moveCid: string;
  plays: number;
}) {
  const { batch } = runAccruePayout(data);
  if (!batch.ready) {
    return { ok: true as const, settled: false as const, batch };
  }
  const settled = await runSettleBatch({
    address: data.address,
    token: data.token,
    moveCid: data.moveCid,
  });
  return { ...settled, settled: true as const, batch };
}

export async function runApprovePayout(data: {
  address: string;
  token: TokenKey;
  moveCid: string;
  usd: number;
}) {
  return settle({ ...data, approved: true });
}
