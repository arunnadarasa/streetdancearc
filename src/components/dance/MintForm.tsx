import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  encodeFunctionData,
  parseUnits,
  type Address,
} from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { TOKENS, type TokenKey, ARC_EXPLORER } from "@/lib/tokens";
import contractCfg from "@/data/contract.json";
import { TokenSwitcher } from "./TokenSwitcher";

const ERC20_APPROVE_ABI = [
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

export function MintForm() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [token, setToken] = useState<TokenKey>("USDC");
  const [cid, setCid] = useState("");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contractAddress = contractCfg.address as Address;
  const contractDeployed = contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000";

  async function onSubmit() {
    setError(null);
    setTxHash(null);
    setBusy(true);
    try {
      if (!authenticated) {
        await login();
        return;
      }
      if (!contractDeployed) {
        throw new Error("Contract not deployed yet. Run `node scripts/deploy-arc.mjs DanceMoveTokens`.");
      }
      const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
      if (!embedded) throw new Error("No embedded wallet. Sign in first.");

      const provider = await embedded.getEthereumProvider();
      await embedded.switchChain(arcTestnet.id);

      const tokenCfg = TOKENS[token];
      const value = parseUnits(amount || "0", tokenCfg.decimals);
      const from = embedded.address as Address;

      const walletClient = createWalletClient({
        account: from,
        chain: arcTestnet,
        transport: custom(provider),
      });
      const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

      // 1. Approve (skip if zero address = unset cirBTC)
      if (tokenCfg.address !== "0x0000000000000000000000000000000000000000") {
        setStatus(`Approving ${tokenCfg.symbol}…`);
        const approveData = encodeFunctionData({
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [contractAddress, value],
        });
        const approveHash = await walletClient.sendTransaction({
          to: tokenCfg.address as Address,
          data: approveData,
          chain: arcTestnet,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 2. Call log(token, amount, cid)
      setStatus(`Logging move on-chain…`);
      const logData = encodeFunctionData({
        abi: contractCfg.abi,
        functionName: "log",
        args: [tokenCfg.address as Address, value, cid || "bafkreidemo"],
      });
      const hash = await walletClient.sendTransaction({
        to: contractAddress,
        data: logData,
        chain: arcTestnet,
      });
      setTxHash(hash);
      setStatus(`Logged with ${tokenCfg.symbol}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-neutral-500">Pay with</p>
        <TokenSwitcher value={token} onChange={setToken} />
        <p className="mt-2 text-xs text-neutral-500">{TOKENS[token].label}</p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-neutral-500">IPFS CID (rights metadata)</label>
        <input
          value={cid}
          onChange={(e) => setCid(e.target.value)}
          placeholder="bafkrei…"
          className="mt-1 w-full rounded-lg border border-neutral-800 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-neutral-500">
          Amount ({TOKENS[token].symbol})
        </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          className="mt-1 w-full rounded-lg border border-neutral-800 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
        />
      </div>

      <button
        disabled={busy}
        onClick={onSubmit}
        className="w-full rounded-full bg-[#1DB954] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#1ed760] disabled:opacity-50"
      >
        {busy ? "Working…" : authenticated ? "Approve & Log Move" : "Sign in with Google"}
      </button>

      {status && <p className="text-sm text-neutral-400">{status}</p>}
      {txHash && (
        <a
          href={`${ARC_EXPLORER}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm text-[#1DB954] hover:underline"
        >
          View tx on Arcscan → {txHash}
        </a>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
