import { useWallet } from "@/lib/wallet-context";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/gx/ModeToggle";
import { PayTokenToggle } from "@/components/gx/PayTokenToggle";
import { BalancePanel } from "@/components/wallet/BalancePanel";
import { MobileDrawer } from "@/components/dance/MobileDrawer";
import { ContractsSheet } from "@/components/dance/ContractsSheet";
import { QuickContractLinks } from "@/components/dance/QuickContractLinks";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import logoMark from "@/assets/streetrail-logo.png";


const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/moves", label: "Moves" },
  { to: "/market", label: "Market" },
  { to: "/agent-negotiation", label: "Negotiate" },
  { to: "/markets", label: "Markets" },
  { to: "/primer", label: "Primer" },
  { to: "/judge", label: "Judge run" },
  { to: "/deck", label: "Deck" },
] as const;

const PRIMARY_NAV = NAV.slice(0, 4);
const MORE_NAV = NAV.slice(4);


export function Header({
  extra,
  quickContracts,
}: {
  extra?: React.ReactNode;
  quickContracts?: boolean;
}) {
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
        className={`rail grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 transition-all duration-300 sm:gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-4 ${
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
            <span className="display block text-[15px] leading-tight text-foreground sm:text-lg">
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


        <nav className="hidden min-w-0 items-center justify-center gap-0.5 xl:flex xl:gap-1">
          {PRIMARY_NAV.map((n) => {

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
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-semibold tracking-wide transition lg:px-3.5 ${
                  MORE_NAV.some((n) => pathname.startsWith(n.to))
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                More
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-40">
              {MORE_NAV.map((n) => (
                <DropdownMenuItem key={n.to} asChild className="text-xs font-semibold">
                  <Link to={n.to}>{n.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5">
          {extra ? <span className="hidden xl:inline-flex">{extra}</span> : null}
          <span className="hidden shrink-0 xl:inline-flex">
            <ContractsSheet />
          </span>
          {quickContracts ? (
            <QuickContractLinks keys={["moveNft", "market"]} />
          ) : null}

          <span className="hidden shrink-0 xl:inline-flex 2xl:hidden">
            <PayTokenToggle compact />
          </span>
          <span className="hidden shrink-0 2xl:inline-flex">
            <PayTokenToggle />
          </span>

          <span className="hidden shrink-0 xl:inline-flex">
            <ModeToggle />
          </span>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 text-foreground transition hover:bg-secondary xl:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>


            <SheetContent
              side="right"
              className="flex w-[min(20rem,calc(100vw-2rem))] flex-col border-border bg-card p-0"
            >
              <SheetHeader className="shrink-0 border-b border-border p-4 text-left">
                <SheetTitle className="display text-left text-sm">StreetRail</SheetTitle>
                <p className="text-xs text-muted-foreground">Street dance merch · settled on Arc</p>
              </SheetHeader>
              <MobileDrawer
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                extra={extra}
              />
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
                  className="lift flex h-11 shrink-0 items-center rounded-full bg-linear-to-r from-primary to-glow px-3 text-[11px] font-bold text-primary-foreground shadow-glow-sm sm:px-4 sm:text-xs xl:h-auto xl:py-2"

                >
                  {authenticated
                    ? addr
                      ? `${addr.slice(0, 4)}…${addr.slice(-4)}`
                      : "Wallet"
                    : (
                      <>
                        Sign in<span className="hidden sm:inline">&nbsp;with Google</span>
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

      <div className={`rail pb-2 xl:hidden ${scrolled ? "pt-0" : "pt-0.5"}`}>
        <ModeToggle full />
      </div>
    </header>

  );
}
