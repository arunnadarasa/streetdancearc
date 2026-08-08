import { useCallback, useEffect, useState } from "react";
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
import { useWallet } from "@/lib/wallet-context";
import { TOKENS, type TokenKey } from "@/lib/tokens";
import { TokenSwitcher } from "@/components/dance/TokenSwitcher";
import { getMarketConfig, listMarketListings } from "@/lib/market.functions";
import { listMoveNfts } from "@/lib/nft.functions";

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

const ZERO = "0x0000000000000000000000000000000000000000";

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
    setStatus(null);
    setTxHash(null);
  }

  function fail(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg.slice(0, 220));
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

  async function onTransfer() {
    begin("transfer");
    try {
      if (!cfg?.configured) throw new Error("Marketplace contract is not deployed.");
      if (!transferToken) throw new Error("Pick one of your move NFTs first.");
      if (!/^0x[0-9a-fA-F]{40}$/.test(transferTo.trim())) throw new Error("Enter a valid Arc address.");
      const { from, wallet, pub } = await clients();
      setStatus("Transferring the rights token…");
      const hash = await wallet.sendTransaction({
        to: cfg.nft as Address,
        data: encodeFunctionData({
          abi: ERC721_ABI,
          functionName: "safeTransferFrom",
          args: [from, transferTo.trim() as Address, BigInt(transferToken)],
        }),
        chain: arcTestnet,
      });
      await pub.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStatus(`Move #${transferToken} sent to ${short(transferTo.trim())}`);
      setTransferTo("");
      await refresh();
    } catch (e) {
      fail(e);
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

        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {detail ?? "No moves are listed yet. List one of yours below and it appears here for anyone to buy."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {listings.map((item) => {
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
                        onClick={() => void onBuy(item)}
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
              onChange={(e) => setTransferToken(e.target.value)}
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
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="0x…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background/50 px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => void onTransfer()}
            disabled={busy !== null}
            className="h-11 w-full rounded-full border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-primary disabled:opacity-50"
          >
            {busy === "transfer" ? "Transferring…" : "Transfer rights"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Gas is paid in USDC on Arc, so no ETH is needed for any of these steps.
          </p>
        </div>
      </div>

      {(status || error || txHash) && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          {status && <p className="text-foreground">{status}</p>}
          {error && <p className="text-red-400">{error}</p>}
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
