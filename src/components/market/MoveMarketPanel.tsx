import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  parseUnits,
  type Address,
} from "viem";
import { ArrowLeftRight, RefreshCw, ShoppingBag, Store, Tag } from "lucide-react";
import { arcTestnet } from "@/lib/arc-chain";
import { mapChainError } from "@/lib/chain-errors";

import { useWallet } from "@/lib/wallet-context";
import { TOKENS, type TokenKey } from "@/lib/tokens";
import { TokenSwitcher } from "@/components/dance/TokenSwitcher";
import { getMarketConfig, listMarketListings } from "@/lib/market.functions";
import { listMoveNfts } from "@/lib/nft.functions";
import { MarketFilters, type MarketFilterValues } from "@/components/market/MarketFilters";

type Listing = Awaited<ReturnType<typeof listMarketListings>>["items"][number];
type Owned = Awaited<ReturnType<typeof listMoveNfts>>["items"][number];

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const ERC721_ABI = [
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getApproved",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const ERC2981_ABI = [
  {
    type: "function",
    name: "royaltyInfo",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "salePrice", type: "uint256" },
    ],
    outputs: [
      { name: "receiver", type: "address" },
      { name: "royaltyAmount", type: "uint256" },
    ],
  },
] as const;

const ZERO = "0x0000000000000000000000000000000000000000";

function formatAtomic(atomic: bigint, decimals: number): string {
  const s = atomic.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

const DEFAULT_FILTERS: MarketFilterValues = { q: "", cat: "all", license: "all", tok: "all", sort: "newest" };

function norm(v: string): string {
  return v.trim().toLowerCase().replace(/^0x/, "");
}

function matchesQuery(item: Listing, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  const hay = [
    item.name ?? "",
    `#${item.tokenId}`,
    item.tokenId,
    item.discipline ?? "",
    item.license ?? "",
    item.symbol,
    item.seller,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/0x/g, "");
  return hay.includes(q);
}

function sortListings(items: Listing[], sort: string): Listing[] {
  const out = [...items];
  const priceOf = (l: Listing) => Number(l.priceAtomic) / 10 ** l.decimals;
  const recency = (l: Listing) => (l.listedAt ? Number(l.listedAt) : 0);
  if (sort === "price-asc") out.sort((a, b) => priceOf(a) - priceOf(b) || Number(a.tokenId) - Number(b.tokenId));
  else if (sort === "price-desc") out.sort((a, b) => priceOf(b) - priceOf(a) || Number(b.tokenId) - Number(a.tokenId));
  else if (sort === "token") out.sort((a, b) => a.symbol.localeCompare(b.symbol) || priceOf(a) - priceOf(b));
  else
    out.sort(
      (a, b) =>
        recency(b) - recency(a) || b.listedIndex - a.listedIndex || Number(b.tokenId) - Number(a.tokenId),
    );
  return out;
}

interface TransferPreflight {
  tokenId: string;
  to: string;
  owner: string;
  isOwner: boolean;
  approvedOperator: string | null;
  marketApprovedForAll: boolean;
  listed: boolean;
  selfSend: boolean;
}


function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function MoveMarketPanel() {
  const { authenticated, login, wallets } = useWallet();
  const getCfg = useServerFn(getMarketConfig);
  const getListings = useServerFn(listMarketListings);
  const getOwned = useServerFn(listMoveNfts);

  const [cfg, setCfg] = useState<Awaited<ReturnType<typeof getMarketConfig>> | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [owned, setOwned] = useState<Owned[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [sellToken, setSellToken] = useState<string>("");
  const [payToken, setPayToken] = useState<TokenKey>("USDC");
  const [price, setPrice] = useState("5");
  const [transferTo, setTransferTo] = useState("");
  const [transferToken, setTransferToken] = useState<string>("");
  const [preflight, setPreflight] = useState<TransferPreflight | null>(null);
  const [staleListing, setStaleListing] = useState<string | null>(null);
  const [buyConfirm, setBuyConfirm] = useState<Listing | null>(null);
  const search = useSearch({ from: "/market" });
  const navigate = useNavigate({ from: "/market" });
  const filters: MarketFilterValues = {
    q: search.q,
    cat: search.cat,
    license: search.license,
    tok: search.tok,
    sort: search.sort,
  };
  const setFilters = useCallback(
    (patch: Partial<MarketFilterValues>) => {
      void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
    },
    [navigate],
  );
  const clearFilters = useCallback(() => {
    void navigate({ search: (prev) => ({ ...prev, ...DEFAULT_FILTERS }), replace: true });
  }, [navigate]);

  const disciplines = useMemo(
    () => Array.from(new Set(listings.map((l) => l.discipline).filter((d): d is string => Boolean(d)))).sort(),
    [listings],
  );
  const licenses = useMemo(
    () => Array.from(new Set(listings.map((l) => l.license).filter((l): l is string => Boolean(l)))).sort(),
    [listings],
  );
  const payTokens = useMemo(
    () => Array.from(new Set(listings.map((l) => l.symbol))).sort(),
    [listings],
  );
  const visible = useMemo(() => {
    const filtered = listings.filter((l) => {
      if (filters.cat !== "all" && (l.discipline ?? "") !== filters.cat) return false;
      if (filters.license !== "all" && (l.license ?? "") !== filters.license) return false;
      if (filters.tok !== "all" && l.symbol !== filters.tok) return false;
      return matchesQuery(l, filters.q);
    });
    return sortListings(filtered, filters.sort);
  }, [listings, filters.cat, filters.license, filters.tok, filters.q, filters.sort]);
  const filtersActive =
    filters.q.trim() !== "" || filters.cat !== "all" || filters.license !== "all" || filters.tok !== "all";
  const [listRoyalty, setListRoyalty] = useState<{ royalty: string; net: string; percent: number } | null>(null);


  const address = (wallets.find((w) => w.walletClientType === "privy")?.address ?? wallets[0]?.address ?? "") as string;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l] = await Promise.all([getCfg({ data: undefined }), getListings({ data: undefined })]);
      setCfg(c);
      setListings(l.items);
      setDetail(l.detail);
      if (address) {
        const mine = await getOwned({ data: { owner: address } });
        setOwned(mine.items);
        if (!sellToken && mine.items[0]) setSellToken(mine.items[0].tokenId);
        if (!transferToken && mine.items[0]) setTransferToken(mine.items[0].tokenId);
      }
    } catch {
      setDetail("Could not load the marketplace right now.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, getCfg, getListings, getOwned]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live "you receive" preview: the royalty is carved out of the listed price.
  useEffect(() => {
    let cancelled = false;
    const decimals = TOKENS[payToken].decimals;
    let value = 0n;
    try {
      value = parseUnits(price || "0", decimals);
    } catch {
      value = 0n;
    }
    if (!cfg?.nft || !sellToken || value <= 0n) {
      setListRoyalty(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const pub = createPublicClient({ chain: arcTestnet, transport: http() });
        const [receiver, amount] = (await pub.readContract({
          address: cfg.nft as Address,
          abi: ERC2981_ABI,
          functionName: "royaltyInfo",
          args: [BigInt(sellToken), value],
        })) as readonly [Address, bigint];
        if (cancelled) return;
        const royalty = receiver && receiver !== ZERO && amount > 0n && amount <= value ? amount : 0n;
        setListRoyalty({
          royalty: formatAtomic(royalty, decimals),
          net: formatAtomic(value - royalty, decimals),
          percent: Number((royalty * 10000n) / value) / 100,
        });
      } catch {
        if (!cancelled) setListRoyalty(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cfg?.nft, sellToken, price, payToken]);

  async function clients() {
    if (!authenticated) {
      await login();
      throw new Error("Sign in to continue.");
    }
    const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
    if (!embedded) throw new Error("No wallet available. Sign in first.");
    const provider = await embedded.getEthereumProvider();
    await embedded.switchChain(arcTestnet.id);
    const from = embedded.address as Address;
    return {
      from,
      wallet: createWalletClient({ account: from, chain: arcTestnet, transport: custom(provider) }),
      pub: createPublicClient({ chain: arcTestnet, transport: http() }),
    };
  }

  function begin(key: string) {
    setBusy(key);
    setError(null);
    setErrorDetail(null);
    setStatus(null);
    setTxHash(null);
    setStaleListing(null);
  }


  function fail(e: unknown, context?: { tokenId?: string }) {
    const friendly = mapChainError(e, context);
    setError(friendly.message);
    setErrorDetail(friendly.detail && friendly.detail !== friendly.message ? friendly.detail : null);
    setStatus(null);
  }


  async function onList() {
    begin("list");
    try {
      if (!cfg?.configured) throw new Error("Marketplace contract is not deployed.");
      if (!sellToken) throw new Error("Pick one of your move NFTs first.");
      const { from, wallet, pub } = await clients();
      const value = parseUnits(price || "0", TOKENS[payToken].decimals);
      if (value <= 0n) throw new Error("Set a price above zero.");

      const approved = (await pub.readContract({
        address: cfg.nft as Address,
        abi: ERC721_ABI,
        functionName: "isApprovedForAll",
        args: [from, cfg.market as Address],
      })) as boolean;

      if (!approved) {
        setStatus("Approving the market to move this token…");
        const h = await wallet.sendTransaction({
          to: cfg.nft as Address,
          data: encodeFunctionData({
            abi: ERC721_ABI,
            functionName: "setApprovalForAll",
            args: [cfg.market as Address, true],
          }),
          chain: arcTestnet,
        });
        await pub.waitForTransactionReceipt({ hash: h });
      }

      setStatus("Publishing the listing on Arc…");
      const hash = await wallet.sendTransaction({
        to: cfg.market as Address,
        data: encodeFunctionData({
          abi: cfg.abi,
          functionName: "list",
          args: [BigInt(sellToken), TOKENS[payToken].address as Address, value],
        }),
        chain: arcTestnet,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStatus(`Move #${sellToken} listed for ${price} ${TOKENS[payToken].symbol}`);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function onBuy(item: Listing) {
    begin(`buy-${item.tokenId}`);
    try {
      if (!cfg?.configured) throw new Error("Marketplace contract is not deployed.");
      const { wallet, pub } = await clients();

      setStatus(`Approving ${item.price} ${item.symbol}…`);
      const approveHash = await wallet.sendTransaction({
        to: item.payToken as Address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [cfg.market as Address, BigInt(item.priceAtomic)],
        }),
        chain: arcTestnet,
      });
      await pub.waitForTransactionReceipt({ hash: approveHash });

      setStatus("Settling on Arc…");
      const hash = await wallet.sendTransaction({
        to: cfg.market as Address,
        data: encodeFunctionData({ abi: cfg.abi, functionName: "buy", args: [BigInt(item.tokenId)] }),
        chain: arcTestnet,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setBuyConfirm(null);
      setStatus(`Bought move #${item.tokenId} for ${item.price} ${item.symbol}`);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function onCancel(item: Listing) {
    begin(`cancel-${item.tokenId}`);
    try {
      if (!cfg?.configured) throw new Error("Marketplace contract is not deployed.");
      const { wallet, pub } = await clients();
      const hash = await wallet.sendTransaction({
        to: cfg.market as Address,
        data: encodeFunctionData({ abi: cfg.abi, functionName: "cancel", args: [BigInt(item.tokenId)] }),
        chain: arcTestnet,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStatus(`Listing for move #${item.tokenId} cancelled`);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  /** Reads ownership + approval state on Arc before anything is signed. */
  async function onCheckTransfer() {
    begin("transfer-check");
    setPreflight(null);
    try {
      if (!cfg?.configured) throw new Error("Marketplace contract is not deployed.");
      if (!transferToken) throw new Error("Pick one of your move NFTs first.");
      const to = transferTo.trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(to)) throw new Error("Enter a valid Arc address (0x followed by 40 hex characters).");

      const { from, pub } = await clients();
      setStatus("Checking ownership and approvals on Arc…");

      const tokenId = BigInt(transferToken);
      const nft = cfg.nft as Address;
      const [owner, approvedOperator, marketApprovedForAll] = await Promise.all([
        pub.readContract({ address: nft, abi: ERC721_ABI, functionName: "ownerOf", args: [tokenId] }) as Promise<string>,
        pub
          .readContract({ address: nft, abi: ERC721_ABI, functionName: "getApproved", args: [tokenId] })
          .then((v) => v as string)
          .catch(() => ZERO),
        cfg.market
          ? (pub.readContract({
              address: nft,
              abi: ERC721_ABI,
              functionName: "isApprovedForAll",
              args: [from, cfg.market as Address],
            }) as Promise<boolean>)
          : Promise.resolve(false),
      ]);

      const isOwner = owner.toLowerCase() === from.toLowerCase();
      setPreflight({
        tokenId: transferToken,
        to,
        owner,
        isOwner,
        approvedOperator: approvedOperator && approvedOperator !== ZERO ? approvedOperator : null,
        marketApprovedForAll,
        listed: listings.some((l) => l.tokenId === transferToken),
        selfSend: to.toLowerCase() === from.toLowerCase(),
      });
      setStatus(null);
      if (!isOwner) {
        setError(`Move #${transferToken} is held by ${short(owner)}, not your wallet. Only the current owner can transfer it.`);
      }

    } catch (e) {
      fail(e, { tokenId: transferToken });
    } finally {
      setBusy(null);
    }
  }

  async function onConfirmTransfer() {
    if (!preflight || !preflight.isOwner) return;
    begin("transfer");
    try {
      if (!cfg?.configured) throw new Error("Marketplace contract is not deployed.");
      const { from, wallet, pub } = await clients();
      setStatus("Transferring the rights token…");
      const hash = await wallet.sendTransaction({
        to: cfg.nft as Address,
        data: encodeFunctionData({
          abi: ERC721_ABI,
          functionName: "safeTransferFrom",
          args: [from, preflight.to as Address, BigInt(preflight.tokenId)],
        }),
        chain: arcTestnet,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStatus(`Move #${preflight.tokenId} sent to ${short(preflight.to)}`);
      setStaleListing(preflight.listed ? preflight.tokenId : null);
      setTransferTo("");
      setPreflight(null);
      await refresh();
    } catch (e) {
      fail(e, { tokenId: preflight.tokenId });
    } finally {
      setBusy(null);
    }
  }


  const explorer = cfg?.explorer ?? "https://testnet.arcscan.app";

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

        {listings.length > 0 && (
          <div className="mt-4">
            <MarketFilters
              values={filters}
              disciplines={disciplines}
              licenses={licenses}
              tokens={payTokens}
              shown={visible.length}
              total={listings.length}
              onChange={setFilters}
              onClear={clearFilters}
            />
          </div>
        )}

        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {detail ?? "No moves are listed yet. List one of yours below and it appears here for anyone to buy."}
          </p>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border/60 bg-surface p-4">
            <p className="text-sm text-muted-foreground">
              No listings match these filters.{" "}
              <button type="button" onClick={clearFilters} className="font-bold text-glow hover:underline">
                Clear filters
              </button>{" "}
              to see all {listings.length}.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {visible.map((item) => {
              const mine = address && item.seller.toLowerCase() === address.toLowerCase();
              return (
                <li key={item.tokenId} className="rounded-xl border border-border/60 bg-surface p-3">
                  {item.mediaUrl && item.mediaKind === "video" ? (
                    <video src={item.mediaUrl} controls playsInline preload="metadata" className="mb-2 aspect-video w-full rounded-lg bg-background object-cover" />
                  ) : item.mediaUrl ? (
                    <img src={item.mediaUrl} alt={item.name ?? `Move #${item.tokenId}`} loading="lazy" className="mb-2 aspect-video w-full rounded-lg bg-background object-cover" />
                  ) : null}
                  <p className="truncate text-sm font-bold text-foreground">{item.name ?? `Move #${item.tokenId}`}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    #{item.tokenId}
                    {item.discipline ? ` · ${item.discipline}` : ""}
                    {item.license ? ` · ${item.license}` : ""}
                  </p>
                  <p className="mt-2 text-lg font-black text-foreground">
                    {item.price} <span className="text-sm font-bold text-glow">{item.symbol}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Seller {short(item.seller)}</p>
                  {Number(item.royaltyAtomic) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Includes {item.royalty} {item.symbol} creator royalty ({item.royaltyPercent}%) · seller nets{" "}
                      {item.sellerNet} {item.symbol}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => void onCancel(item)}
                        disabled={busy !== null}
                        className="inline-flex h-10 items-center rounded-full border border-border px-4 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                      >
                        {busy === `cancel-${item.tokenId}` ? "Cancelling…" : "Cancel listing"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setErrorDetail(null);
                          setBuyConfirm(item);
                        }}
                        disabled={busy !== null}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                        {busy === `buy-${item.tokenId}` ? "Buying…" : `Buy with ${item.symbol}`}
                      </button>
                    )}
                    <a href={item.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center text-xs text-glow hover:underline">
                      Arcscan →
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {buyConfirm && (
        <div className="min-w-0 space-y-2 rounded-2xl border border-primary/50 bg-card/70 p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Confirm purchase</p>
          <p className="text-sm font-bold text-foreground">
            {buyConfirm.name ?? "Move"} · #{buyConfirm.tokenId}
          </p>
          <dl className="grid gap-1 text-[13px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">You pay</dt>
              <dd className="font-bold text-foreground">
                {buyConfirm.price} {buyConfirm.symbol}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                Creator royalty{Number(buyConfirm.royaltyAtomic) > 0 ? ` (${buyConfirm.royaltyPercent}%)` : ""}
              </dt>
              <dd className="text-foreground">
                {Number(buyConfirm.royaltyAtomic) > 0
                  ? `${buyConfirm.royalty} ${buyConfirm.symbol}`
                  : `0 ${buyConfirm.symbol}`}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Seller receives</dt>
              <dd className="text-foreground">
                {buyConfirm.sellerNet} {buyConfirm.symbol}
              </dd>
            </div>
          </dl>
          {buyConfirm.royaltyReceiver && Number(buyConfirm.royaltyAtomic) > 0 && (
            <p className="min-w-0 break-all text-[11px] text-muted-foreground">
              Royalty goes to <span className="font-mono text-glow">{buyConfirm.royaltyReceiver}</span> in the same
              transaction, in {buyConfirm.symbol}.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            You approve the full price; the split happens on-chain inside the buy.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void onBuy(buyConfirm)}
              disabled={busy !== null}
              className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-50"
            >
              {busy === `buy-${buyConfirm.tokenId}` ? "Buying…" : `Confirm & pay ${buyConfirm.price} ${buyConfirm.symbol}`}
            </button>
            <button
              type="button"
              onClick={() => setBuyConfirm(null)}
              disabled={busy !== null}
              className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-glow" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">List a move</p>
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Your move NFT</span>
            <select
              value={sellToken}
              onChange={(e) => setSellToken(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">{owned.length ? "Select a move" : "No move NFTs in this wallet"}</option>
              {owned.map((o) => (
                <option key={o.tokenId} value={o.tokenId}>
                  #{o.tokenId} · {o.name ?? "Untitled move"}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Price in</span>
            <div className="mt-1"><TokenSwitcher value={payToken} onChange={setPayToken} /></div>
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Price</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          {listRoyalty && (
            <p className="text-[11px] text-muted-foreground">
              Creator royalty {listRoyalty.royalty} {TOKENS[payToken].symbol}
              {listRoyalty.percent > 0 ? ` (${listRoyalty.percent}%)` : ""} is carved out of the price — you receive{" "}
              <span className="font-bold text-foreground">
                {listRoyalty.net} {TOKENS[payToken].symbol}
              </span>
              .
            </p>
          )}
          <button
            type="button"
            onClick={() => void onList()}
            disabled={busy !== null}
            className="h-11 w-full rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
          >
            {busy === "list" ? "Listing…" : authenticated ? "List for sale" : "Sign in to list"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Non-custodial: the token stays in your wallet and only moves when someone pays your price.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-glow" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Transfer a move</p>
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Your move NFT</span>
            <select
              value={transferToken}
              onChange={(e) => {
                setTransferToken(e.target.value);
                setPreflight(null);
              }}
              disabled={busy !== null}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">{owned.length ? "Select a move" : "No move NFTs in this wallet"}</option>
              {owned.map((o) => (
                <option key={o.tokenId} value={o.tokenId}>
                  #{o.tokenId} · {o.name ?? "Untitled move"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Recipient address</span>
            <input
              value={transferTo}
              onChange={(e) => {
                setTransferTo(e.target.value);
                setPreflight(null);
              }}
              placeholder="0x…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy !== null}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>

          {preflight ? (
            <div className="min-w-0 space-y-2 rounded-xl border border-border/60 bg-surface p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Step 2 · Confirm transfer
              </p>
              <p className="text-sm font-bold text-foreground">
                {owned.find((o) => o.tokenId === preflight.tokenId)?.name ?? "Move"} · #{preflight.tokenId}
              </p>
              <p className="text-xs text-muted-foreground">
                From {short(address || preflight.owner)} → {short(preflight.to)}
              </p>
              <code className="block break-all text-[11px] text-glow">{preflight.to}</code>

              <ul className="space-y-1 text-[11px]">
                <li className={preflight.isOwner ? "text-muted-foreground" : "text-red-400"}>
                  {preflight.isOwner
                    ? "Ownership check passed — this wallet holds the token."
                    : `Held by ${short(preflight.owner)}, not your wallet.`}
                </li>
                <li className="text-muted-foreground">
                  {preflight.marketApprovedForAll
                    ? "The marketplace still has blanket approval on your wallet (needed for listings)."
                    : "No blanket marketplace approval on your wallet."}
                </li>
                {preflight.approvedOperator && (
                  <li className="text-muted-foreground">
                    Per-token operator approved: {short(preflight.approvedOperator)} — it clears on transfer.
                  </li>
                )}
                {preflight.selfSend && (
                  <li className="text-amber-400">This is your own address — the transfer would be a no-op that still costs gas.</li>
                )}
                {preflight.listed && (
                  <li className="text-amber-400">
                    This move is actively listed. The listing will point at a token you no longer own — cancel it first.
                  </li>
                )}
              </ul>
              <p className="text-[11px] text-muted-foreground">Transfers are irreversible once confirmed on Arc.</p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void onConfirmTransfer()}
                  disabled={busy !== null || !preflight.isOwner}
                  className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-50"
                >
                  {busy === "transfer" ? "Transferring…" : "Confirm transfer"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreflight(null)}
                  disabled={busy !== null}
                  className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void onCheckTransfer()}
              disabled={busy !== null}
              className="h-11 w-full rounded-full border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-primary disabled:opacity-50"
            >
              {busy === "transfer-check"
                ? "Checking ownership…"
                : authenticated
                  ? "Check & review transfer"
                  : "Sign in to transfer"}
            </button>
          )}

          <p className="text-[11px] text-muted-foreground">
            Gas is paid in USDC on Arc, so no ETH is needed for any of these steps.
          </p>

        </div>
      </div>

      {(status || error || txHash || staleListing) && (
        <div className="min-w-0 rounded-xl border border-border bg-surface p-4 text-sm">
          {status && <p className="text-foreground">{status}</p>}
          {error && <p className="break-words text-red-400">{error}</p>}
          {errorDetail && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[11px] uppercase tracking-widest text-muted-foreground">
                Details
              </summary>
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                {errorDetail}
              </pre>
            </details>
          )}
          {staleListing && (
            <p className="mt-1 text-[11px] text-amber-400">
              Move #{staleListing} was still listed when it moved. The listing is now stale — only the new owner can settle
              or cancel it.
            </p>
          )}
          {txHash && (
            <a href={`${explorer}/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-glow hover:underline">
              View receipt on Arcscan →
            </a>
          )}
        </div>
      )}


      {cfg?.market && (
        <p className="break-all text-[11px] text-muted-foreground">
          Market contract: <code>{cfg.market}</code>
        </p>
      )}
    </div>
  );
}
