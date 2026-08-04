import { usePrivy } from "@privy-io/react-auth";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/gx/ModeToggle";

const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/markets", label: "Markets" },
  { to: "/deck", label: "Deck" },
] as const;

export function Header() {
  const { authenticated, login, logout, user, ready } = usePrivy();
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
        className={`rail flex items-center justify-between gap-3 transition-all duration-300 ${
          scrolled ? "py-2.5" : "py-4"
        }`}
      >
        <Link to="/" className="group flex min-w-0 items-center gap-3">
          <span
            className={`grid shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-glow font-black text-primary-foreground shadow-glow-sm transition-all duration-300 ${
              scrolled ? "h-8 w-8 text-sm" : "h-10 w-10 text-base"
            }`}
          >
            ♪
          </span>
          <span className="min-w-0">
            <span className="display block truncate text-[15px] text-foreground sm:text-lg">
              Dance Move Tokens
            </span>
            <span
              className={`block truncate text-[11px] tracking-wide text-muted-foreground transition-all duration-300 ${
                scrolled ? "hidden" : "hidden sm:block"
              }`}
            >
              Arc Testnet · Movement licensing on IPFS
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

        <div className="flex shrink-0 items-center gap-2">
          <ModeToggle />
          {ready && (
            <button
              onClick={authenticated ? logout : login}
              className="lift shrink-0 rounded-full bg-linear-to-r from-primary to-glow px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-glow-sm sm:px-4"
            >
              {authenticated
                ? addr
                  ? `${addr.slice(0, 6)}…${addr.slice(-4)}`
                  : "Sign out"
                : (
                  <>
                    Sign in<span className="hidden sm:inline"> with Google</span>
                  </>
                )}
            </button>
          )}
        </div>
      </div>

      <nav className="rail flex items-center gap-1.5 overflow-x-auto pb-2 md:hidden">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
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
    </header>
  );
}
