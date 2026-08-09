import { useCallback, useEffect, useState } from "react";
import { ARC_RPC_URL, TOKEN_KEYS, type TokenKey } from "@/lib/tokens";

export type Balances = Partial<Record<TokenKey, string | null>>;

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; balances: Balances }>();

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
 * Legacy Arc balance hook — soft-disabled after Midnight pivot.
 * Returns empty balances so UI never polls Arc RPC.
 */
export function useArcBalances(address?: string) {
  const [balances, setBalances] = useState<Balances>(() =>
    address ? (cache.get(address)?.balances ?? {}) : {},
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (_force = false) => {
      if (!address || !ARC_RPC_URL) {
        setBalances({});
        setLoading(false);
        return;
      }
      // Arc RPC removed — keep empty cache so callers stay quiet.
      const next = Object.fromEntries(TOKEN_KEYS.map((k) => [k, null])) as Balances;
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

/** @deprecated Arc eth_call balance — always null after Midnight pivot. */
export async function readBalance(_token: TokenKey, _address: string): Promise<string | null> {
  return null;
}
