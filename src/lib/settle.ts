import { createPublicClient, createWalletClient, custom, encodeFunctionData, http, type Address, type EIP1193Provider } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARC_EXPLORER, TOKENS, type TokenKey } from "@/lib/tokens";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface SettleResult {
  hash: `0x${string}`;
  from: Address;
  to: Address;
  token: TokenKey;
  atomic: string;
  explorer: string;
}

interface EmbeddedWallet {
  address: string;
  getEthereumProvider: () => Promise<unknown>;
  switchChain: (id: number) => Promise<void>;
}

/**
 * One settlement path for H2H, H2A and A2A.
 *
 * USDC is Arc's gas token, so paying in USDC is a native value transfer.
 * EURC and cirBTC are ERC-20s, so those become a real transfer(to, amount)
 * call against the token contract. Both produce a real Arc transaction.
 */
export async function settleOnArc(
  wallet: EmbeddedWallet,
  token: TokenKey,
  to: Address,
  atomic: bigint,
): Promise<SettleResult> {
  const cfg = TOKENS[token];
  const provider = (await wallet.getEthereumProvider()) as EIP1193Provider;
  await wallet.switchChain(arcTestnet.id);
  const from = wallet.address as Address;

  const walletClient = createWalletClient({
    account: from,
    chain: arcTestnet,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

  const hash = cfg.native
    ? await walletClient.sendTransaction({ to, value: atomic, chain: arcTestnet })
    : await walletClient.sendTransaction({
        to: cfg.address as Address,
        data: encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [to, atomic],
        }),
        chain: arcTestnet,
      });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Transfer reverted on Arc (${hash}).`);
  }

  return {
    hash,
    from,
    to,
    token,
    atomic: atomic.toString(),
    explorer: `${ARC_EXPLORER}/tx/${hash}`,
  };
}

/** How the settlement is described in receipts and step logs. */
export function settlementNote(token: TokenKey): string {
  return TOKENS[token].native
    ? "USDC is the gas token on Arc, so one native transfer settles the order."
    : `${TOKENS[token].symbol} is an ERC-20 on Arc, so settlement is a transfer() call — gas is still paid in USDC.`;
}
