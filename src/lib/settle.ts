import type { TokenKey } from "@/lib/tokens";
import { INDEXER_URL, txExplorerUrl } from "@/lib/tokens";
import { settleViaX402Facilitator } from "@/lib/x402-client";

export interface SettleResult {
  hash: `0x${string}` | string;
  from: string;
  to: string;
  token: TokenKey;
  atomic: string;
  explorer: string;
  simulated?: boolean;
  network?: string;
  /** Base64 x402 v2 PAYMENT-SIGNATURE used for the settle (for purchase retry). */
  paymentSignature?: string;
  nonce?: string;
}

interface EmbeddedWallet {
  address: string;
  getEthereumProvider?: () => Promise<unknown>;
  switchChain?: (id: number) => Promise<void>;
}

/**
 * Settle H2H / H2A / A2A on Midnight Undeployed via x402 facilitator
 * (challenge → verify → settle / genesis server-append mUSDC).
 */
export async function settleOnMidnight(
  wallet: EmbeddedWallet | null | undefined,
  token: TokenKey,
  to: string,
  atomic: bigint,
  memo?: string,
): Promise<SettleResult> {
  const settled = await settleViaX402Facilitator({
    amountAtomic: atomic,
    payTo: to && to.length >= 64 && !to.includes(":") ? to : undefined,
    memo: memo ?? `streetrail-settle:${token}`,
    from: wallet?.address,
  });

  return {
    hash: settled.hash,
    from: settled.from,
    to: settled.to,
    token,
    atomic: settled.atomic,
    explorer: txExplorerUrl(settled.hash),
    simulated: settled.simulated,
    network: settled.network || "undeployed",
    paymentSignature: settled.paymentSignature,
    nonce: settled.nonce,
  };
}

/** @deprecated alias — Arc settlement replaced by Midnight Undeployed mUSDC */
export const settleOnArc = settleOnMidnight;

export function settlementNote(token: TokenKey): string {
  return `Settles as experimental mUSDC on Midnight Undeployed (priced as ${token}). Indexer: ${INDEXER_URL}`;
}
