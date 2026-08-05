import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { usePayToken } from "@/lib/pay-token";
import {
  ARC_RPC_URL,
  TOKENS,
  TOKEN_KEYS,
  fromAtomic,
  getTokenUsdRate,
  type TokenKey,
  type FxRates,
} from "@/lib/tokens";
import { useServerFn } from "@tanstack/react-start";
import { fetchFxRates } from "@/lib/fx.functions";

// balanceOf(address) selector
const BALANCE_OF = "0x70a08231";

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

async function readBalance(token: TokenKey, address: string): Promise<string | null> {
  const cfg = TOKENS[token];
  const hex = cfg.native
    ? await rpc("eth_getBalance", [address, "latest"])
    : await rpc("eth_call", [
        { to: cfg.address, data: BALANCE_OF + address.slice(2).toLowerCase().padStart(64, "0") },
        "latest",
      ]);
  if (!hex) return null;
  return fromAtomic(BigInt(hex), token);
}

function short(v: string | null): string {
  if (v === null) return "—";
  const n = Number(v);
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(n < 1 ? 4 : 2);
}

/**
 * Global settlement-currency pill. The choice applies to every mode: the merch
 * checkout, the delegated agent, the x402 agent-to-agent flow and the payout
 * inbox. Balances are read live off Arc through the same-origin RPC proxy.
 */
export function PayTokenToggle() {
  const [token, setToken] = usePayToken();
  const { user, authenticated } = useWallet();
  const address = user?.wallet?.address;
  const [balances, setBalances] = useState<Partial<Record<TokenKey, string | null>>>({});
  const [fx, setFx] = useState<FxRates | null>(null);
  const getFx = useServerFn(fetchFxRates);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalances({});
      return;
    }
    const entries = await Promise.all(
      TOKEN_KEYS.map(async (k) => [k, await readBalance(k, address)] as const),
    );
    setBalances(Object.fromEntries(entries));
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh, token]);

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => { mounted = false; };
  }, [getFx]);

  const active = TOKENS[token];
  const activeBalance = balances[token];
  const empty = authenticated && activeBalance !== undefined && Number(activeBalance ?? 0) === 0;

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-surface/70 p-0.5">
      {TOKEN_KEYS.map((k) => {
        const on = k === token;
        const bal = balances[k];
        const rate = getTokenUsdRate(k, fx);
        return (
          <button
            key={k}
            type="button"
            onClick={() => setToken(k)}
            title={
              bal === undefined || bal === null
                ? `${TOKENS[k].label} — 1 USD ≈ ${rate.toPrecision(4)} ${TOKENS[k].symbol}`
                : `${TOKENS[k].label} — balance ${short(bal)} ${TOKENS[k].symbol} · 1 USD ≈ ${rate.toPrecision(4)} ${TOKENS[k].symbol}`
            }
            aria-pressed={on}
            className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wide transition sm:px-2.5 sm:text-[11px] ${
              on
                ? "bg-linear-to-r from-primary to-glow text-primary-foreground shadow-glow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TOKENS[k].symbol}
            {bal !== undefined && bal !== null && Number(bal) === 0 ? (
              <span className="ml-0.5 text-[9px] opacity-70">·0</span>
            ) : null}
          </button>
        );
      })}
      <span className="sr-only">
        Settling in {active.symbol}
        {empty ? " — no balance on Arc Testnet" : ""}
      </span>
    </div>
  );
}
