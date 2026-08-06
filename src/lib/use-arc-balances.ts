import { useCallback, useEffect, useState } from "react";
import { ARC_RPC_URL, TOKENS, TOKEN_KEYS, fromAtomic, type TokenKey } from "@/lib/tokens";

export type Balances = Partial<Record<TokenKey, string | null>>;

// balanceOf(address) selector
const BALANCE_OF = "0x70a08231";
const TTL_MS = 30_000;

const cache = new Map<string, { at: number; balances: Balances }>();

async function rpc(method: string, params: unknown[]): Promise<string | null> {
  try {
    const res = await fetch(ARC_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const json = (await res.json()) as { result?: string; error?: unknown };
    if (json.error || typeof json.result !== "string") return null;
    return json.result;
  } catch {
    return null;
  }
}

/** One balance read off Arc; never throws — returns null when the RPC is unhappy. */
export async function readBalance(token: TokenKey, address: string): Promise<string | null> {
  const cfg = TOKENS[token];
  const hex = cfg.native
    ? await rpc("eth_getBalance", [address, "latest"])
    : await rpc("eth_call", [
        { to: cfg.address, data: BALANCE_OF + address.slice(2).toLowerCase().padStart(64, "0") },
        "latest",
      ]);
  if (!hex) return null;
  try {
    return fromAtomic(BigInt(hex), token);
  } catch {
    return null;
  }
}

/** Pretty-print a balance string for compact UI. */
export function shortBalance(v: string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(n < 1 ? 4 : 2);
}

/**
 * All three Arc balances for one address, read through the same-origin RPC
 * proxy and shared between the header pill and the balances panel via a short
 * module-level cache so they never double-poll.
 */
export function useArcBalances(address?: string) {
  const [balances, setBalances] = useState<Balances>(() =>
    address ? (cache.get(address)?.balances ?? {}) : {},
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!address) {
        setBalances({});
        return;
      }
      const hit = cache.get(address);
      if (!force && hit && Date.now() - hit.at < TTL_MS) {
        setBalances(hit.balances);
        return;
      }
      setLoading(true);
      const entries = await Promise.all(
        TOKEN_KEYS.map(async (k) => [k, await readBalance(k, address)] as const),
      );
      const next = Object.fromEntries(entries) as Balances;
      cache.set(address, { at: Date.now(), balances: next });
      setBalances(next);
      setLoading(false);
    },
    [address],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { balances, loading, refresh: () => load(true) };
}
