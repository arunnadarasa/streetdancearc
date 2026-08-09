import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Images, RefreshCw, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { listMidnightMoveNfts } from "@/lib/move-nft.functions";

type Nft = Awaited<ReturnType<typeof listMidnightMoveNfts>>["items"][number];

function short(hash: string) {
  const h = hash.replace(/^0x/i, "");
  return h ? `${h.slice(0, 10)}…${h.slice(-8)}` : "—";
}

export function MoveNftGallery() {
  const { authenticated, wallets, unshieldedAddress, login } = useWallet();
  const [items, setItems] = useState<Nft[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [contract, setContract] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const list = useServerFn(listMidnightMoveNfts);

  const owner =
    unshieldedAddress ||
    wallets.find((w) => w.walletClientType === "privy")?.address ||
    wallets[0]?.address ||
    "";

  async function load() {
    if (!owner) return;
    setLoading(true);
    try {
      const res = await list({ data: { owner } });
      setItems(res.items);
      setDetail(res.detail);
      setContract(res.contract);
    } catch {
      setDetail("Could not load your MoveNfts right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images className="h-4 w-4 text-glow" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            My MoveNfts
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !owner}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Compact Move Rights NFTs minted on Midnight Undeployed. List them on{" "}
        <a href="/market" className="text-glow hover:underline">
          /market
        </a>
        .
      </p>

      {!authenticated || !owner ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <button type="button" onClick={() => void login()} className="text-glow hover:underline">
            Connect Lace or the Undeployed session
          </button>{" "}
          to see moves you minted.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {detail ?? "No MoveNfts yet — use Prove & mint move NFT above."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((nft) => (
            <li key={nft.tokenId} className="rounded-xl border border-border/60 bg-surface p-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <BadgeCheck className="h-4 w-4 shrink-0 text-glow" aria-hidden />
                <span className="truncate">{nft.name}</span>
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                #{nft.tokenId}
                {nft.listed ? ` · listed ${nft.listedPriceAtomic} atomic` : " · unlisted"}
              </p>
              <a
                href={nft.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-glow hover:underline"
              >
                {nft.mintTxId ? short(nft.mintTxId) : "Indexer"} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {contract && (
        <p className="mt-3 break-all text-[11px] text-muted-foreground">
          Contract: <code>{contract}</code>
        </p>
      )}
    </div>
  );
}
