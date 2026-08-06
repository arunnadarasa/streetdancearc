// Server-only nanopayment accrual ledger.
//
// Per-play royalties are far too small to settle one-by-one on Arc: each
// on-chain payout costs USDC gas and the testnet faucet only gives 20 USDC a
// day. So the Rights Agent accrues micro-USD amounts here and settles a whole
// batch in a single transfer + registry log.
//
// Deliberately in-memory (no DB): the demo runs without Lovable Cloud, and the
// ledger is session-scoped in exactly the same way as a2h.server.ts's
// sessionPayouts cache.

import type { TokenKey } from "@/lib/tokens";

export interface NanoItem {
  id: string;
  plays: number;
  microUsd: number;
  atSeconds: number;
}

export interface Accrual {
  key: string;
  batchId: string;
  address: string;
  moveCid: string;
  token: TokenKey;
  plays: number;
  microUsd: number;
  items: NanoItem[];
  openedAt: number;
}

const ledger = new Map<string, Accrual>();

export function accrualKey(address: string, moveCid: string, token: TokenKey) {
  return `${address.toLowerCase()}:${moveCid}:${token}`;
}

function newBatchId() {
  return `batch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Add one nanopayment to the open batch for this move/token, creating it if needed. */
export function accrue(input: {
  address: string;
  moveCid: string;
  token: TokenKey;
  plays: number;
  microUsd: number;
}): Accrual {
  const key = accrualKey(input.address, input.moveCid, input.token);
  const now = Math.floor(Date.now() / 1000);
  const existing = ledger.get(key);
  const batch: Accrual = existing ?? {
    key,
    batchId: newBatchId(),
    address: input.address.toLowerCase(),
    moveCid: input.moveCid,
    token: input.token,
    plays: 0,
    microUsd: 0,
    items: [],
    openedAt: now,
  };

  batch.items.push({
    id: `nano_${batch.items.length + 1}_${now}`,
    plays: input.plays,
    microUsd: input.microUsd,
    atSeconds: now,
  });
  if (batch.items.length > 200) batch.items.splice(0, batch.items.length - 200);
  batch.plays += input.plays;
  batch.microUsd += input.microUsd;

  ledger.set(key, batch);
  return batch;
}

export function getAccrual(key: string): Accrual | undefined {
  return ledger.get(key);
}

export function listAccruals(address?: string): Accrual[] {
  const wanted = address?.toLowerCase();
  return [...ledger.values()]
    .filter((a) => !wanted || a.address === wanted)
    .sort((a, b) => b.microUsd - a.microUsd);
}

/** Remove and return the open batch — called once its settlement tx lands. */
export function closeAccrual(key: string): Accrual | undefined {
  const batch = ledger.get(key);
  if (batch) ledger.delete(key);
  return batch;
}
