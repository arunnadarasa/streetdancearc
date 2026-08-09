import { useCallback, useEffect, useState } from "react";
import { txExplorerUrl as indexerTxUrl, type TokenKey } from "@/lib/tokens";

/**
 * Browser-side settlement ledger for Midnight Undeployed settles
 * (H2H cart, H2A, A2A negotiation, etc.).
 */

export type TxMode = "H2H" | "H2A" | "A2A" | "A2H";
export type TxStatus = "pending" | "success" | "failed";

export type TxEntry = {
  hash: string;
  mode: TxMode;
  label: string;
  token: TokenKey;
  /** Atomic units as a decimal string, so BigInt survives JSON. */
  atomic?: string;
  /** Pre-formatted amount when atomic units aren't available (agent-side payouts). */
  amountFormatted?: string;
  to?: string;
  from?: string;
  at: number;
  status: TxStatus;
  explorer: string;
};

const KEY = "streetrail.txlog.v1";
const LIMIT = 50;
const EVENT = "streetrail:txlog";

function read(): TxEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as TxEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: TxEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, LIMIT)));
  } catch {
    /* quota or private mode — the demo still works, just without history */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function txExplorerUrl(hash: string): string {
  return indexerTxUrl(hash);
}

function looksConfirmed(hash: string, status?: TxStatus): TxStatus {
  if (status) return status;
  const h = hash.replace(/^0x/i, "");
  if (!h || /^0*SIMULATED$/i.test(hash) || /SIMULATED/i.test(hash)) return "pending";
  // Real Undeployed settle returns a ledger hash once the proof landed.
  if (/^[0-9a-fA-F]{64}$/.test(h)) return "success";
  return "pending";
}

/** Append a settlement. Re-recording the same hash updates the existing row. */
export function recordSettlement(
  entry: Omit<TxEntry, "at" | "status" | "explorer"> &
    Partial<Pick<TxEntry, "at" | "status" | "explorer">>,
): void {
  const full: TxEntry = {
    ...entry,
    at: entry.at ?? Date.now(),
    status: looksConfirmed(entry.hash, entry.status),
    explorer: entry.explorer ?? txExplorerUrl(entry.hash),
  };
  const rest = read().filter((e) => e.hash.toLowerCase() !== full.hash.toLowerCase());
  write([full, ...rest]);
}

export function setSettlementStatus(hash: string, status: TxStatus): void {
  const entries = read();
  let changed = false;
  const next = entries.map((e) => {
    if (e.hash.toLowerCase() !== hash.toLowerCase() || e.status === status) return e;
    changed = true;
    return { ...e, status };
  });
  if (changed) write(next);
}

export function clearSettlements(): void {
  write([]);
}

/** Live view of the ledger, in sync across tabs and components. */
export function useTxLog(mode?: TxMode) {
  const [entries, setEntries] = useState<TxEntry[]>([]);

  const refresh = useCallback(() => setEntries(read()), []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return {
    entries: mode ? entries.filter((e) => e.mode === mode) : entries,
    refresh,
    clear: clearSettlements,
  };
}
