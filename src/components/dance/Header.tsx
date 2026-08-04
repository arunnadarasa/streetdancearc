import { usePrivy } from "@privy-io/react-auth";
import { Link } from "@tanstack/react-router";
import { ModeToggle } from "@/components/gx/ModeToggle";


export function Header() {
  const { authenticated, login, logout, user, ready } = usePrivy();
  const addr = user?.wallet?.address;

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-black font-black">
          ♪
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
            Dance Move Tokens
          </h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            Arc Testnet · Movement licensing on IPFS
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ModeToggle />
        <Link

          to="/markets"
          className="shrink-0 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-surface"
        >
          Markets
        </Link>
        <Link
          to="/deck"
          className="shrink-0 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-surface"
        >
          Deck
        </Link>
        <Link
          to="/shop"
          className="shrink-0 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-surface"
        >
          Shop<span className="hidden sm:inline"> merch</span> →
        </Link>

        {ready && (
          <button
            onClick={authenticated ? logout : login}
            className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-black hover:bg-foreground/85 sm:px-4"
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
    </header>
  );
}
