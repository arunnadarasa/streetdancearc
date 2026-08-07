import { useWallet } from "@/lib/wallet-context";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { ModeToggle } from "@/components/gx/ModeToggle";
import { PayTokenToggle } from "@/components/gx/PayTokenToggle";
import { BalancePanel } from "@/components/wallet/BalancePanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import logoMark from "@/assets/streetrail-logo.png";


const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/moves", label: "Moves" },
  { to: "/agent-negotiation", label: "Negotiate" },
  { to: "/markets", label: "Markets" },
  { to: "/deck", label: "Deck" },
] as const;


export function Header({ extra }: { extra?: React.ReactNode }) {
  const { authenticated, login, logout, user, ready, available } = useWallet();

  const addr = user?.wallet?.address;
  const [scrolled, setScrolled] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!walletOpen) return;
    const onDown = (e: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) setWalletOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWalletOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [walletOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "glass border-b border-border/80 shadow-elevated"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div
        className={`rail grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 transition-all duration-300 sm:gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4 ${
          scrolled ? "py-2" : "py-2.5 sm:py-4"
        }`}
      >

        <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            className={`grid shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-glow p-1.5 shadow-glow-sm transition-all duration-300 ${
              scrolled ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8 sm:h-10 sm:w-10"
            }`}
          >
            <img
              src={logoMark}
              alt="StreetRail logo"
              width={1024}
              height={1024}
              className="h-full w-full object-contain brightness-0 invert"
            />
          </span>
          <span className="min-w-0">
            <span className="display block truncate text-[13px] leading-tight text-foreground sm:text-lg">
              StreetRail
            </span>
            <span
              className={`block truncate text-[11px] tracking-wide text-muted-foreground transition-all duration-300 ${
                scrolled ? "hidden" : "hidden sm:block"
              }`}
            >
              Street dance merch · settled on Arc
            </span>

          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-0.5 md:flex lg:gap-1">
          {NAV.map((n) => {

            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-semibold tracking-wide transition lg:px-3.5 ${
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {extra ? <span className="hidden md:inline-flex">{extra}</span> : null}
          <span className="hidden sm:inline-flex">
            <PayTokenToggle />
          </span>
          <ModeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 text-foreground transition hover:bg-secondary md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(20rem,calc(100vw-2rem))] border-border bg-card p-0">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle className="display text-left text-sm">StreetRail</SheetTitle>
                <p className="text-xs text-muted-foreground">Street dance merch · settled on Arc</p>
              </SheetHeader>
              <nav className="flex flex-col p-2">
                {NAV.map((n) => {
                  const active = pathname.startsWith(n.to);
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                        active
                          ? "bg-primary/15 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="space-y-4 border-t border-border p-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Mode</span>
                  <ModeToggle />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Currency</span>
                  <PayTokenToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>


          {!available ? (
            <span
              title="No Privy app ID resolved (server secret PRIVY_APP_ID and build-time VITE_PRIVY_APP_ID are both empty)."
              className="shrink-0 rounded-full border border-border/80 bg-secondary/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground sm:px-4 sm:py-2 sm:text-xs"
            >
              Wallet unavailable
            </span>
          ) : (
            ready && (
              <div ref={walletRef} className="relative shrink-0">
                <button
                  onClick={() => (authenticated ? setWalletOpen((v) => !v) : void login())}
                  aria-expanded={authenticated ? walletOpen : undefined}
                  aria-haspopup={authenticated ? "dialog" : undefined}
                  className="lift shrink-0 rounded-full bg-linear-to-r from-primary to-glow px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-glow-sm sm:px-4 sm:py-2 sm:text-xs"
                >
                  {authenticated
                    ? addr
                      ? `${addr.slice(0, 4)}…${addr.slice(-4)}`
                      : "Wallet"
                    : (
                      <>
                        Sign in<span className="hidden sm:inline"> with Google</span>
                      </>
                    )}
                </button>
                {authenticated && walletOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50">
                    <BalancePanel onClose={() => setWalletOpen(false)} />
                  </div>
                )}
              </div>
            )
          )}

        </div>
      </div>
    </header>
  );
}
