import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftRight, RefreshCw, ShoppingBag, Store, Tag } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { parseUnits } from "viem";
import { TOKENS } from "@/lib/tokens";
import {
  buyMidnightMoveNft,
  cancelMidnightMoveListing,
  getMoveNftConfig,
  listMidnightMoveForSale,
  listMidnightMoveListings,
  listMidnightMoveNfts,
  transferMidnightMoveNft,
} from "@/lib/move-nft.functions";
import { recordSettlement } from "@/lib/tx-log";

type Listing = Awaited<ReturnType<typeof listMidnightMoveListings>>["items"][number];
type Owned = Awaited<ReturnType<typeof listMidnightMoveNfts>>["items"][number];

function short(a: string) {
  if (!a) return "—";
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}…${a.slice(-4)}`;
}

export function MidnightMoveMarketPanel() {
  const { authenticated, login, wallets, unshieldedAddress } = useWallet();
  const getCfg = useServerFn(getMoveNftConfig);
  const getListings = useServerFn(listMidnightMoveListings);
  const getOwned = useServerFn(listMidnightMoveNfts);
  const doList = useServerFn(listMidnightMoveForSale);
  const doCancel = useServerFn(cancelMidnightMoveListing);
  const doBuy = useServerFn(buyMidnightMoveNft);
  const doTransfer = useServerFn(transferMidnightMoveNft);

  const ownerLabel =
    unshieldedAddress ||
    wallets.find((w) => w.walletClientType === "privy")?.address ||
    wallets[0]?.address ||
    "";

  const [cfg, setCfg] = useState<Awaited<ReturnType<typeof getMoveNftConfig>> | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [owned, setOwned] = useState<Owned[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [sellToken, setSellToken] = useState("");
  const [price, setPrice] = useState("5");
  const [transferTo, setTransferTo] = useState("");
  const [transferToken, setTransferToken] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l] = await Promise.all([getCfg({ data: undefined }), getListings({ data: undefined })]);
      setCfg(c);
      setListings(l.items as Listing[]);
      setDetail(l.detail);
      if (ownerLabel) {
        const mine = await getOwned({ data: { owner: ownerLabel } });
        setOwned(mine.items as Owned[]);
        if (!sellToken && mine.items[0]) setSellToken(mine.items[0].tokenId);
        if (!transferToken && mine.items[0]) setTransferToken(mine.items[0].tokenId);
      } else {
        setOwned([]);
      }
    } catch (e) {
      setDetail(e instanceof Error ? e.message : "Could not load MoveNft market.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerLabel, getCfg, getListings, getOwned]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => listings, [listings]);

  async function ensureAuth() {
    if (!authenticated) {
      await login();
      throw new Error("Connect Lace or the Undeployed session to continue.");
    }
    if (!ownerLabel) throw new Error("No Midnight session address.");
  }

  async function onList() {
    setBusy("list");
    setError(null);
    setStatus(null);
    setTxHash(null);
    try {
      await ensureAuth();
      if (!sellToken) throw new Error("Select a MoveNft to list.");
      const atomic = parseUnits(price || "0", TOKENS.USDC.decimals);
      if (atomic <= 0n) throw new Error("Enter a price greater than zero.");
      setStatus("Listing on Compact MoveNft…");
      const res = await doList({
        data: {
          tokenId: sellToken,
          ownerLabel,
          priceAtomic: atomic.toString(),
        },
      });
      setTxHash(res.txId);
      recordSettlement({
        hash: res.txId,
        mode: "H2H",
        label: `Listed Move NFT #${sellToken}`,
        token: "USDC",
        amountFormatted: `${price} mUSDC`,
      });
      setStatus(`Listed #${sellToken} for ${price} mUSDC.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onCancel(tokenId: string) {
    setBusy(`cancel-${tokenId}`);
    setError(null);
    try {
      await ensureAuth();
      const res = await doCancel({ data: { tokenId, ownerLabel } });
      setTxHash(res.txId);
      setStatus(`Cancelled listing for #${tokenId}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onBuy(item: Listing) {
    setBusy(`buy-${item.tokenId}`);
    setError(null);
    setStatus(null);
    try {
      await ensureAuth();
      setStatus("Paying mUSDC then transferring MoveNft…");
      const res = await doBuy({ data: { tokenId: item.tokenId, buyerLabel: ownerLabel } });
      setTxHash(res.nftTxId);
      recordSettlement({
        hash: res.nftTxId,
        mode: "H2H",
        label: `Bought Move NFT #${item.tokenId}`,
        token: "USDC",
        amountFormatted: `${item.price} mUSDC`,
      });
      setStatus(`Bought #${item.tokenId} for ${item.price} mUSDC.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onTransfer() {
    setBusy("transfer");
    setError(null);
    setStatus(null);
    try {
      await ensureAuth();
      if (!transferToken) throw new Error("Select a MoveNft to transfer.");
      if (!transferTo.trim()) throw new Error("Enter a recipient mn_addr… or session label.");
      setStatus("Transferring Compact MoveNft…");
      const res = await doTransfer({
        data: {
          tokenId: transferToken,
          fromLabel: ownerLabel,
          toLabel: transferTo.trim(),
        },
      });
      setTxHash(res.txId);
      recordSettlement({
        hash: res.txId,
        mode: "H2H",
        label: `Transferred Move NFT #${transferToken}`,
        token: "USDC",
      });
      setStatus(`Transferred #${transferToken} to ${short(transferTo.trim())}.`);
      setTransferTo("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-glow" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Move rights marketplace
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Compact MoveNft on Midnight Undeployed — list and buy settle in experimental mUSDC via
          server-append. Mint on{" "}
          <a href="/moves" className="text-glow hover:underline">
            /moves
          </a>{" "}
          first.
        </p>

        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {detail ?? "No listings yet. Mint a MoveNft then list one below."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {visible.map((item) => {
              const mine = ownerLabel && item.seller === ownerLabel;
              return (
                <li key={item.tokenId} className="rounded-xl border border-border/60 bg-surface p-3">
                  <p className="truncate text-sm font-bold text-foreground">
                    {item.name ?? `Move #${item.tokenId}`}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    #{item.tokenId}
                  </p>
                  <p className="mt-2 text-lg font-black text-foreground">
                    {item.price} <span className="text-sm font-bold text-glow">mUSDC</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Seller {short(item.seller)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => void onCancel(item.tokenId)}
                        disabled={busy !== null}
                        className="inline-flex h-10 items-center rounded-full border border-border px-4 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                      >
                        {busy === `cancel-${item.tokenId}` ? "Cancelling…" : "Cancel listing"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onBuy(item)}
                        disabled={busy !== null}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                        {busy === `buy-${item.tokenId}` ? "Buying…" : "Buy with mUSDC"}
                      </button>
                    )}
                    <a
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center text-xs text-glow hover:underline"
                    >
                      Indexer →
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-glow" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              List a move
            </p>
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Your MoveNft
            </span>
            <select
              value={sellToken}
              onChange={(e) => setSellToken(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">
                {owned.length ? "Select a move" : "No MoveNfts in this session — mint on /moves"}
              </option>
              {owned.map((o) => (
                <option key={o.tokenId} value={o.tokenId}>
                  #{o.tokenId} · {o.name}
                  {o.listed ? " (listed)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Price (mUSDC)
            </span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => void onList()}
            disabled={busy !== null}
            className="h-11 w-full rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
          >
            {busy === "list" ? "Listing…" : authenticated ? "List for sale" : "Sign in to list"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Ownership stays with you until someone buys; settle is experimental mUSDC.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-glow" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Transfer a move
            </p>
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Your MoveNft
            </span>
            <select
              value={transferToken}
              onChange={(e) => setTransferToken(e.target.value)}
              disabled={busy !== null}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">
                {owned.length ? "Select a move" : "No MoveNfts in this session"}
              </option>
              {owned.map((o) => (
                <option key={o.tokenId} value={o.tokenId}>
                  #{o.tokenId} · {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Recipient (mn_addr… or session label)
            </span>
            <input
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="mn_addr_…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy !== null}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => void onTransfer()}
            disabled={busy !== null}
            className="h-11 w-full rounded-full border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-primary disabled:opacity-50"
          >
            {busy === "transfer"
              ? "Transferring…"
              : authenticated
                ? "Transfer MoveNft"
                : "Sign in to transfer"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Transfers clear any active listing. Gas is tDUST on Undeployed (server-append).
          </p>
        </div>
      </div>

      {(status || error || txHash || cfg?.address) && (
        <div className="min-w-0 rounded-xl border border-border bg-surface p-4 text-sm">
          {status && <p className="text-foreground">{status}</p>}
          {error && <p className="break-words text-red-400">{error}</p>}
          {txHash && (
            <p className="mt-1 break-all text-xs text-muted-foreground">tx {txHash}</p>
          )}
          {cfg?.address && (
            <p className="mt-2 break-all text-[11px] text-muted-foreground">
              MoveNft {cfg.address}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
