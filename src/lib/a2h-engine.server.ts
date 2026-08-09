// A2H orchestration: nanopayment accrual, batch settlement on Midnight Undeployed,
// cap checks, FX and signed AP2 receipts.
// Kept out of a2h.functions.ts because server-fn splitting deletes siblings.

import { getFxRates } from "@/lib/fx.server";
import { convertFromUsd, getTokenUsdRate, microToUsd, usdToMicro, FALLBACK_RATES } from "@/lib/fx";
import { TOKENS, INDEXER_URL, txExplorerUrl, toAtomic, type TokenKey } from "@/lib/tokens";
import { treasuryContractCall } from "@/lib/circle.server";
import { MIDNIGHT_NETWORK } from "@/lib/agent-card";

import { signMandate } from "@/lib/mandate-sign.server";
import { approveAuthOnChain, AUTHORIZER, authorizerUrl } from "@/lib/erc1271.server";
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

const ARC_CAIP2 = MIDNIGHT_NETWORK;
const isUndeployed = () => (process.env.VITE_NETWORK_ID ?? "undeployed") === "undeployed";

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
  const fx = await getFxRates().catch(() => ({ ...FALLBACK_RATES, stale: true }));

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
    payouts: payouts.map((p) => ({ ...p, receiptUrl: txExplorerUrl(p.txHash) })),
    registry: REGISTRY,
    registryUrl: INDEXER_URL,
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
      recipient: { address: input.address, network: ARC_CAIP2 },
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
        {
          scheme: isUndeployed() ? "midnight-tx" : "evm-tx",
          role: "transfer",
          txHash: result.transferTx,
          network: ARC_CAIP2,
        },
        {
          scheme: isUndeployed() ? "midnight-tx" : "evm-tx",
          role: "registry-log",
          txHash: result.registryTx,
          network: ARC_CAIP2,
        },
      ],
      issuedAt: new Date().toISOString(),
    };

    const onChainAuth = await approveAuthOnChain(mandate);

    return {
      ok: true as const,
      ...result,
      receiptUrl: txExplorerUrl(result.transferTx),
      registryUrl: txExplorerUrl(result.registryTx),
      onChainAuth,
      mandate: { ...mandate, signature: signMandate(mandate), onChainAuth },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "payout_failed";
    return {
      ok: false as const,
      reason: message.split(":")[0] ?? "payout_failed",
      detail: humanizePayoutError(message),
      value,
      token: input.token,
    };
  }
}

/** Turn raw Circle / RPC failure strings into one readable line. */
function humanizePayoutError(message: string): string {
  if (/Indexer history is empty|Midnight MoveRegistry|missing_secret/i.test(message)) {
    return "Midnight Undeployed settle failed — check the local node, indexer, proof server, and mandate signing.";
  }
  if (message.includes("circle_tx_timeout")) {
    return "The payout transaction is still pending — check the indexer in a moment.";
  }
  if (message.includes("insufficient") || message.includes("INSUFFICIENT")) {
    return "mUSDC faucet/transfer failed on Undeployed — retry after the proof server is warm.";
  }
  if (message.startsWith("circle_")) {
    return "Legacy Circle payout path rejected the request. Retry on Midnight Undeployed.";
  }
  return message.split(":").slice(0, 2).join(": ").slice(0, 160);
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

/**
 * Claim an agent-pushed offer. Agent-side receipt only: the treasury logs the
 * claim to the rights registry via Circle (no user wallet prompt, no user gas).
 * Discount amounts are logged for audit and do NOT count against payout caps.
 */
export async function runClaimOffer(data: {
  address: string;
  token: TokenKey;
  offerId: string;
  title: string;
  /** Discounted price in the settle token, already formatted (e.g. "56.68"). */
  value: string;
  expiresInHours?: number;
}) {
  const fx = await getFxRates().catch(() => ({ ...FALLBACK_RATES, stale: true }));
  const value = Number(data.value).toFixed(places(data.token));
  const usd = Number(value) / getTokenUsdRate(data.token, fx);
  const cfg = TOKENS[data.token];
  const atomic = toAtomic(value, data.token);

  const claimCode = `SR-${data.offerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}-${data.address.slice(-4).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + (data.expiresInHours ?? 6) * 3_600_000).toISOString();

  try {
    let txHash = "";
    if (isUndeployed() || !process.env["CIRCLE_API_KEY"]) {
      const { createHash } = await import("node:crypto");
      const { DEMO_SCALE } = await import("@/lib/agent-card");
      const { musdcTransfer } = await import("@/lib/musdc.server");
      const { appendEntry } = await import("@/lib/append-entry.server");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const scaled = (Number(value) * DEMO_SCALE).toFixed(6);
      const scaledAtomic = toAtomic(scaled, data.token);
      const toHex = createHash("sha256").update(`streetrail:a2h-claim:${data.address}`).digest("hex");
      const transfer = await musdcTransfer({
        toHex,
        amountAtomic: scaledAtomic.toString(),
      });
      txHash = transfer.midnightTxHash;
      const deployPath = path.resolve("src/data/midnight-contract.undeployed.json");
      if (fs.existsSync(deployPath)) {
        const j = JSON.parse(fs.readFileSync(deployPath, "utf8")) as {
          address?: string;
          contracts?: { moveRegistry?: { address?: string } };
        };
        const registryAddr = j.contracts?.moveRegistry?.address || j.address;
        if (registryAddr) {
          const anchored = await appendEntry({
            contractAddress: registryAddr,
            appTag: "streetrail_a2h_claim",
            message: `srclaim:${data.offerId}:${data.address.toLowerCase()}`,
            payload: { claimCode, settleTx: txHash, value: scaled },
          });
          txHash = anchored.txId || txHash;
        }
      }
    } else {
      const registry = await treasuryContractCall({
        contractAddress: REGISTRY,
        abiFunctionSignature: "log(address,uint256,string)",
        abiParameters: [
          cfg.address,
          atomic.toString(),
          `srclaim:${data.offerId}:${data.address.toLowerCase()}`,
        ],
      });
      txHash = registry.txHash ?? "";
    }

    const claim = {
      ap2Version: "0.1",
      type: "OfferClaim",
      claimId: claimCode,
      agent: "did:web:streetrail.lovable.app#drop-agent",
      subject: { address: data.address, network: ARC_CAIP2 },
      offer: { id: data.offerId, title: data.title },
      amount: { value, asset: data.token, usd: usd.toFixed(4) },
      authorization: "standing_mandate",
      proof: [
        {
          scheme: isUndeployed() ? "midnight-tx" : "evm-tx",
          role: "registry-log",
          txHash,
          network: ARC_CAIP2,
        },
      ],
      issuedAt: new Date().toISOString(),
      expires_at: expiresAt,
    };
    const onChainAuth = await approveAuthOnChain(claim);

    return {
      ok: true as const,
      claimCode,
      txHash,
      value,
      token: data.token,
      expiresAt,
      receiptUrl: txExplorerUrl(txHash),
      onChainAuth,
      claim: { ...claim, signature: signMandate(claim), onChainAuth },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "claim_failed";
    return {
      ok: false as const,
      reason: message.split(":")[0] ?? "claim_failed",
      detail: humanizePayoutError(message),
      value,
      token: data.token,
    };
  }
}



/**
 * Renew the standing AP2 payout mandate.
 * On Undeployed: Ed25519 sign + Compact MandateVault.anchorMandate (indexer receipt).
 */
export async function runRenewMandate(data: {
  address: string;
  token: TokenKey;
  days: number;
}) {
  const fx = await getFxRates();
  const rate = getTokenUsdRate(data.token, fx);
  const p = places(data.token);
  const expiresAt = new Date(Date.now() + data.days * 86_400_000).toISOString();
  const mandate = {
    type: "ap2.payout-mandate",
    version: "0.1",
    subject: `did:midnight:undeployed:${data.address}`,
    agent: "did:web:streetrail.lovable.app#rights-agent",
    settle_token: data.token,
    chain: ARC_CAIP2,
    per_payout_cap: (PER_PAYOUT_CAP_USD * rate).toFixed(p),
    daily_cap: (DAILY_CAP_USD * rate).toFixed(p),
    notify: ["payout", "approval", "offer", "mandate"],
    renewed_at: new Date().toISOString(),
    expires_at: expiresAt,
  };
  const signature = signMandate(mandate);
  const signedMandate = { ...mandate, signature };
  let onChainAuth = await approveAuthOnChain(signedMandate, data.days * 86_400);
  let receiptUrl: string | null = onChainAuth.receiptUrl;

  if (isUndeployed()) {
    const { computeAuthHash } = await import("@/lib/erc1271.server");
    const { anchorMandateOnUndeployed } = await import("@/lib/anchor-mandate.server");
    const mandateHash = computeAuthHash(signedMandate);
    const anchored = await anchorMandateOnUndeployed({
      mandateHash,
      seller: "streetrail.rights-agent",
      amount: Math.round(PER_PAYOUT_CAP_USD * 1e6),
    });
    receiptUrl = txExplorerUrl(anchored.midnightTxHash);
    onChainAuth = {
      ...onChainAuth,
      scheme: "midnight-mandate-vault",
      authorizer: anchored.contractAddress,
      authorizerUrl: receiptUrl,
      hash: mandateHash,
      txHash: anchored.midnightTxHash,
      receiptUrl,
      valid: true,
      detail: "Anchored on Compact MandateVault (Undeployed).",
    };
  }

  return {
    ok: true as const,
    expiresAt,
    authorizer: onChainAuth.authorizer || AUTHORIZER,
    authorizerUrl: onChainAuth.authorizerUrl || authorizerUrl(),
    onChainAuth,
    receiptUrl,
    mandate: { ...signedMandate, onChainAuth },
  };
}
