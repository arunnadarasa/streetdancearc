import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { usePayToken } from "@/lib/pay-token";
import { INDEXER_URL, NETWORK_ID, TOKENS, TOKEN_KEYS } from "@/lib/tokens";

/**
 * Undeployed wallet panel: network, address, dust (if Lace), mUSDC settlement note.
 */
export function BalancePanel({ onClose }: { onClose?: () => void }) {
  const { user, authenticated, login, logout, network, unshieldedAddress, dustBalance } =
    useWallet();
  const address = unshieldedAddress || user?.wallet?.address;
  const [token, setToken] = usePayToken();

  if (!authenticated) {
    return (
      <div className="w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" /> Midnight
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Connect Lace on Undeployed, or connect without Lace — cart and moves settle via genesis
          server-append (mUSDC / MoveRegistry).
        </p>
        <button
          onClick={() => void login()}
          className="mt-3 w-full rounded-full bg-linear-to-r from-primary to-glow px-4 py-2 text-[11px] font-bold text-primary-foreground"
        >
          Connect
        </button>
      </div>
    );
  }

  const dustLabel =
    dustBalance === null || dustBalance === undefined
      ? "—"
      : dustBalance === 0n
        ? "0 (Lace fees; writes use server-append)"
        : dustBalance.toString();

  return (
    <div className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-elevated">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" /> Midnight Undeployed
      </p>

      {address && (
        <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{address}</p>
      )}

      <dl className="mt-3 space-y-1.5 text-[11px]">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Network</dt>
          <dd className="font-semibold text-foreground">{network || NETWORK_ID}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">tDUST</dt>
          <dd className="font-semibold tabular-nums text-foreground">{dustLabel}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        Settlement token
      </p>
      <ul className="mt-2 space-y-1.5">
        {TOKEN_KEYS.map((k) => {
          const cfg = TOKENS[k];
          const on = k === token;
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => {
                  setToken(k);
                  onClose?.();
                }}
                aria-pressed={on}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  on
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-background/40 hover:border-border/80"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-black text-foreground">{cfg.symbol}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {cfg.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Settlements prove via the local proof server and land on Undeployed. Verify at{" "}
        <a href={INDEXER_URL} target="_blank" rel="noreferrer" className="underline">
          indexer GraphQL
        </a>
        .
      </p>

      <button
        onClick={() => void logout()}
        className="mt-3 w-full rounded-full border border-border px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
      >
        Disconnect
      </button>
    </div>
  );
}
