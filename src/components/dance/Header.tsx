import { usePrivy } from "@privy-io/react-auth";

export function Header() {
  const { authenticated, login, logout, user, ready } = usePrivy();
  const addr = user?.wallet?.address;

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1DB954] text-black font-black">
          ♪
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">Dance Move Tokens</h1>
          <p className="text-xs text-neutral-500">Arc Testnet · Movement licensing on IPFS</p>
        </div>
      </div>
      {ready && (
        <button
          onClick={authenticated ? logout : login}
          className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200"
        >
          {authenticated
            ? addr
              ? `${addr.slice(0, 6)}…${addr.slice(-4)} · Sign out`
              : "Sign out"
            : "Sign in with Google"}
        </button>
      )}
    </header>
  );
}
