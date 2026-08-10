import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Images, RefreshCw } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { listMoveNfts } from "@/lib/nft.functions";

type Nft = Awaited<ReturnType<typeof listMoveNfts>>["items"][number];

export function MoveNftGallery() {
  const { authenticated, wallets } = useWallet();
  const [items, setItems] = useState<Nft[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [contract, setContract] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const list = useServerFn(listMoveNfts);

  const owner = wallets.find((w) => w.walletClientType === "privy")?.address ?? wallets[0]?.address ?? "";

  async function load() {
    if (!owner) return;
    setLoading(true);
    try {
      const res = await list({ data: { owner } });
      setItems(res.items);
      setDetail(res.detail);
      setContract(res.contract);
      setConfigured(res.configured);
    } catch {
      setDetail("Could not load your move NFTs right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  if (!configured) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images className="h-4 w-4 text-glow" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            My move NFTs
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

      {!authenticated || !owner ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to see the move rights tokens held by your wallet.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {detail ?? "No move NFTs yet — log a move and one is minted to your wallet."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((nft) => (
            <li key={nft.tokenId} className="rounded-xl border border-border/60 bg-surface p-3">
              {nft.mediaUrl && nft.mediaKind === "video" ? (
                <video
                  src={nft.mediaUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="mb-2 aspect-video w-full rounded-lg bg-background object-cover"
                />
              ) : nft.mediaUrl ? (
                <img
                  src={nft.mediaUrl}
                  alt={nft.name ?? `Move token #${nft.tokenId}`}
                  loading="lazy"
                  className="mb-2 aspect-video w-full rounded-lg bg-background object-cover"
                />
              ) : null}
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <BadgeCheck className="h-4 w-4 shrink-0 text-glow" aria-hidden />
                <span className="truncate">{nft.name ?? `Move #${nft.tokenId}`}</span>
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                #{nft.tokenId}
                {nft.discipline ? ` · ${nft.discipline}` : ""}
                {nft.license ? ` · ${nft.license}` : ""}
              </p>
              <a
                href={nft.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-glow hover:underline"
              >
                View on Arcscan →
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
