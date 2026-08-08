import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode2,
  Github,
  Globe2,
  Handshake,
  Home,
  Loader2,
  Music2,
  Presentation,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { usePayToken } from "@/lib/pay-token";
import { useArcBalances, shortBalance } from "@/lib/use-arc-balances";
import { useCartStore } from "@/stores/cartStore";
import { fetchFxRates } from "@/lib/fx.functions";
import { ARC_EXPLORER, TOKENS, TOKEN_KEYS, getTokenUsdRate, type FxRates } from "@/lib/tokens";

const REPO_URL = "https://github.com/arunnadarasa/streetdancearc";
const REGISTRY_ADDRESS = "0x4d13b45f823f8944522890c20d8695b6005465f0";
const AUTHORIZER_ADDRESS = "0x0519c703cde7cbff6829fdfdcfe8c9a4c7aac327";

type NavRow = { to: string; label: string; hint: string; icon: LucideIcon; exact?: boolean };

const NAV_ROWS: NavRow[] = [
  { to: "/", label: "Home", hint: "The rail, in one screen", icon: Home, exact: true },
  { to: "/shop", label: "Shop", hint: "Streetwear, paid in stablecoins", icon: ShoppingBag },
  { to: "/moves", label: "Moves", hint: "Log a move, own the credit", icon: Music2 },
  { to: "/market", label: "Market", hint: "Buy, sell and transfer move rights", icon: Music2 },
  { to: "/agent-negotiation", label: "Negotiate", hint: "Watch two agents settle", icon: Handshake },
  { to: "/markets", label: "Markets", hint: "Where the demand already is", icon: Globe2 },
  { to: "/primer", label: "Primer", hint: "Web3 explained in dance terms", icon: BookOpen },
  { to: "/judge", label: "Judge run", hint: "All four modes, end to end", icon: Presentation },
  { to: "/deck", label: "Deck", hint: "The judges' walkthrough", icon: Presentation },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Mobile navigation drawer: routes, wallet + settlement currency, cart and the
 * on-chain reference links. Rendered inside the header's <Sheet>.
 */
export function MobileDrawer({
  pathname,
  onNavigate,
  extra,
}: {
  pathname: string;
  onNavigate: () => void;
  extra?: React.ReactNode;
}) {
  const { authenticated, login, logout, user, ready, available } = useWallet();
  const address = user?.wallet?.address;
  const [token, setToken] = usePayToken();
  const { balances, loading, refresh } = useArcBalances(authenticated ? address : undefined);
  const [fx, setFx] = useState<FxRates | null>(null);
  const [copied, setCopied] = useState(false);
  const getFx = useServerFn(fetchFxRates);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => {
      mounted = false;
    };
  }, [getFx]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ROWS.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={onNavigate}
                className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                  active ? "bg-primary/15 text-foreground" : "text-foreground hover:bg-secondary/60"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
                    active
                      ? "border-primary/50 bg-primary/20 text-primary"
                      : "border-border bg-background/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{n.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{n.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </nav>

        {extra ? (
          <div className="border-t border-border p-3">
            <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-background/40 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">Cart</span>
                <span className="block text-[11px] text-muted-foreground">
                  {cartCount === 0
                    ? "Nothing in the bag yet"
                    : `${cartCount} item${cartCount === 1 ? "" : "s"} ready to settle`}
                </span>
              </span>
              <span onClick={onNavigate} className="shrink-0">
                {extra}
              </span>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="h-3 w-3" /> Wallet · settlement currency
              </span>
            </SectionLabel>
            {authenticated && (
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold text-muted-foreground disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {loading ? "Reading" : "Refresh"}
              </button>
            )}
          </div>

          {!available ? (
            <p className="rounded-xl border border-border bg-background/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Wallet unavailable — no Privy app ID is configured for this build.
            </p>
          ) : !ready ? (
            <p className="px-1 text-[11px] text-muted-foreground">Loading wallet…</p>
          ) : !authenticated ? (
            <button
              type="button"
              onClick={() => void login()}
              className="w-full rounded-full bg-linear-to-r from-primary to-glow px-4 py-3 text-xs font-bold text-primary-foreground shadow-glow-sm"
            >
              Sign in with Google
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="flex w-full items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-left"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                {address ?? "No embedded wallet"}
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>
          )}

          <ul className="space-y-1.5">
            {TOKEN_KEYS.map((k) => {
              const cfg = TOKENS[k];
              const bal = balances[k];
              const rate = getTokenUsdRate(k, fx);
              const usd = bal === null || bal === undefined ? null : Number(bal) / rate;
              const on = k === token;
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setToken(k)}
                    aria-pressed={on}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                      on ? "border-primary/60 bg-primary/10" : "border-border bg-background/40"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-black text-foreground">{cfg.symbol}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {cfg.label}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-bold tabular-nums text-foreground">
                        {authenticated ? shortBalance(bal) : "—"}
                      </span>
                      <span className="block text-[10px] tabular-nums text-muted-foreground">
                        {usd === null || !authenticated ? "tap to select" : `≈ $${usd.toFixed(2)}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {authenticated && (
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full rounded-full border border-border px-4 py-2 text-[11px] font-bold text-muted-foreground"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-1 border-t border-border bg-card p-3">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <Github className="h-3.5 w-3.5 shrink-0" /> GitHub repo
          <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
        </a>
        <a
          href={`${ARC_EXPLORER}/address/${REGISTRY_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <FileCode2 className="h-3.5 w-3.5 shrink-0" /> DanceMoveTokens on Arcscan
          <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
        </a>
        <a
          href={`${ARC_EXPLORER}/address/${AUTHORIZER_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <FileCode2 className="h-3.5 w-3.5 shrink-0" /> StreetRailAuthorizer on Arcscan
          <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
        </a>
        <p className="px-2 pt-1 text-[10px] text-muted-foreground">Arc Testnet · chain 5042002</p>
      </div>
    </div>
  );
}
