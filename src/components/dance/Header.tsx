import { useWallet } from "@/lib/wallet-context";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/gx/ModeToggle";
import { PayTokenToggle } from "@/components/gx/PayTokenToggle";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
        className={`rail grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 transition-all duration-300 sm:gap-3 ${
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

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide transition ${
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


          {!available ? (
            <span
              title="No Privy app ID resolved (server secret PRIVY_APP_ID and build-time VITE_PRIVY_APP_ID are both empty)."
              className="shrink-0 rounded-full border border-border/80 bg-secondary/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground sm:px-4 sm:py-2 sm:text-xs"
            >
              Wallet unavailable
            </span>
          ) : (
            ready && (
              <button
                onClick={authenticated ? logout : login}
                className="lift shrink-0 rounded-full bg-linear-to-r from-primary to-glow px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-glow-sm sm:px-4 sm:py-2 sm:text-xs"
              >
                {authenticated
                  ? addr
                    ? `${addr.slice(0, 4)}…${addr.slice(-4)}`
                    : "Sign out"
                  : (
                    <>
                      Sign in<span className="hidden sm:inline"> with Google</span>
                    </>
                  )}
              </button>
            )
          )}

        </div>
      </div>

      <div className={`rail flex items-center gap-2 md:hidden ${scrolled ? "pb-1.5" : "pb-2"}`}>
        <div className="relative min-w-0 flex-1">
          <nav className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                    active
                      ? "border-primary/60 bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent" />
        </div>
        <span className="shrink-0 sm:hidden">
          <PayTokenToggle />
        </span>
        {extra ? <div className="shrink-0">{extra}</div> : null}
      </div>



    </header>
  );
}
