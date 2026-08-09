import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useServerFn } from "@tanstack/react-start";
import { INDEXER_URL, TOKENS, type TokenKey, convertFromUsd, type FxRates, txExplorerUrl } from "@/lib/tokens";
import midnightContract from "@/data/midnight-contract.json";
import { fetchFxRates } from "@/lib/fx.functions";
import { getMoveNftConfig } from "@/lib/nft.functions";
import { recordSettlement } from "@/lib/tx-log";
import { MetadataPreview } from "./MetadataPreview";

export function MintForm() {
  const { authenticated, login, wallets, unshieldedAddress } = useWallet();
  const token: TokenKey = "USDC";
  const [cid, setCid] = useState("");
  const [amount, setAmount] = useState("1");
  const [usdAmount, setUsdAmount] = useState("1");
  const [mode, setMode] = useState<"token" | "usd">("token");
  const [fx, setFx] = useState<FxRates | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [nftTokenId, setNftTokenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinCfg, setPinCfg] = useState<{
    pinningEnabled: boolean;
    maxUploadBytes: number;
  } | null>(null);
  const getFx = useServerFn(fetchFxRates);
  const getNftCfg = useServerFn(getMoveNftConfig);
  const ownerLabel =
    unshieldedAddress ||
    wallets.find((w) => w.walletClientType === "privy")?.address ||
    wallets[0]?.address ||
    "mn_addr_undeployed1qqqqserverappend";

  useEffect(() => {
    let mounted = true;
    void getFx({ data: undefined }).then((rates) => {
      if (mounted) setFx(rates);
    });
    return () => {
      mounted = false;
    };
  }, [getFx]);

  useEffect(() => {
    let mounted = true;
    void getNftCfg({ data: undefined })
      .then((cfg) => {
        if (mounted) {
          setPinCfg({
            pinningEnabled: cfg.pinningEnabled,
            maxUploadBytes: cfg.maxUploadBytes,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [getNftCfg]);

  const contractAddress =
    (import.meta.env.VITE_DEFAULT_CONTRACT as string) ||
    (midnightContract as { address?: string }).address ||
    "";
  const contractDeployed =
    !!contractAddress && !/^0+$/.test(contractAddress.replace(/^0x/, ""));

  const tokenPerUsd = convertFromUsd(1, token, fx) || 1;
  const tokenAmount =
    mode === "usd"
      ? convertFromUsd(parseFloat(usdAmount || "0"), token, fx).toFixed(6)
      : amount;
  const usdEquivalent =
    mode === "usd" ? parseFloat(usdAmount || "0") : parseFloat(amount || "0") / tokenPerUsd;

  async function onSubmit() {
    setError(null);
    setTxHash(null);
    setNftTokenId(null);
    setBusy(true);
    setStatus(null);
    try {
      if (!authenticated) {
        await login();
        return;
      }
      if (!contractDeployed) {
        throw new Error("MoveRegistry not deployed. Run: bun run compile");
      }
      if (!cid.trim()) throw new Error("Enter a move CID or message to anchor.");

      setStatus("Proving MoveRegistry append… first call can take up to ~4 min on a cold proof server.");
      const message = JSON.stringify({
        kind: "move-log",
        cid: cid.trim(),
        token,
        amount: tokenAmount,
        usd: usdEquivalent,
        at: new Date().toISOString(),
      });
      const res = await fetch("/api/public/append-entry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          appTag: "streetrail_move_registry",
          message,
        }),
      });
      const body = (await res.json()) as { txId?: string; error?: string };
      if (!res.ok) throw new Error(body.error || `append-entry failed (${res.status})`);
      const hash = body.txId || null;
      setTxHash(hash);
      if (hash) {
        recordSettlement({
          hash,
          mode: "H2H",
          label: `Move log · ${cid.trim().slice(0, 48)}`,
          token,
          amountFormatted: `${tokenAmount} ${TOKENS[token].symbol}`,
        });
      }

      setStatus("Minting Compact MoveNft…");
      const mintRes = await fetch("/api/public/move-nft-mint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerLabel,
          uri: message,
        }),
      });
      const mintBody = (await mintRes.json()) as {
        tokenId?: string;
        txId?: string;
        error?: string;
      };
      if (!mintRes.ok) throw new Error(mintBody.error || `move-nft-mint failed (${mintRes.status})`);
      setNftTokenId(mintBody.tokenId ?? null);
      if (mintBody.txId) {
        recordSettlement({
          hash: mintBody.txId,
          mode: "H2H",
          label: `Move NFT #${mintBody.tokenId} · ${cid.trim().slice(0, 40)}`,
          token,
          amountFormatted: `${tokenAmount} ${TOKENS[token].symbol}`,
        });
        setTxHash(mintBody.txId);
      }
      setStatus(
        `Anchored on MoveRegistry and minted MoveNft #${mintBody.tokenId ?? "?"} — list it on /market.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card/60 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Move registry</p>
          <h3 className="display text-xl text-foreground">Log a move on Midnight</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Append MoveRegistry + mint Compact MoveNft · indexer {INDEXER_URL}
          </p>
        </div>
        <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          mUSDC
        </span>
      </div>

      <label className="block text-xs text-muted-foreground">
        Amount ({TOKENS[token].symbol})
        <input
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={mode === "usd" ? undefined : amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setMode("token");
          }}
          placeholder="1.0"
        />
      </label>
      <label className="block text-xs text-muted-foreground">
        USD equivalent
        <input
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={mode === "token" ? usdEquivalent.toFixed(2) : usdAmount}
          onChange={(e) => {
            setUsdAmount(e.target.value);
            setMode("usd");
          }}
        />
      </label>

      <MetadataPreview
        token={token === "cirBTC" ? "cirBTC" : token === "EURC" ? "EURC" : "USDC"}
        amount={tokenAmount}
        cid={cid || null}
        pinningEnabled={pinCfg?.pinningEnabled ?? false}
        maxUploadBytes={pinCfg?.maxUploadBytes ?? 25 * 1024 * 1024}
        onConfirm={(next) => setCid(next)}
        onReset={() => setCid("")}
      />

      <div>
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          IPFS CID (rights metadata)
        </label>
        <input
          value={cid}
          onChange={(e) => setCid(e.target.value)}
          placeholder="bafkrei… (or preview above)"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Confirm the preview above, or paste a CID you already pinned.
        </p>
      </div>

      <button
        type="button"
        disabled={busy || !cid.trim()}
        onClick={() => void onSubmit()}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Proving…" : authenticated ? "Prove & mint move NFT" : "Connect & mint"}
      </button>

      {!contractDeployed && (
        <p className="text-xs text-amber-400">
          Contract address missing — run <code>bun run compile</code> after Docker is up.
        </p>
      )}
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {nftTokenId && (
        <p className="text-xs text-foreground">
          MoveNft token <span className="font-semibold">#{nftTokenId}</span> —{" "}
          <a href="/market" className="text-glow underline">
            list on Market
          </a>
        </p>
      )}
      {txHash && (
        <a
          className="block text-xs text-glow underline"
          href={txExplorerUrl(txHash)}
          target="_blank"
          rel="noreferrer"
        >
          View tx in indexer · {txHash.slice(0, 18)}…
        </a>
      )}
    </div>
  );
}
