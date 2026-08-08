/** Maps raw viem / wallet errors into copy a dancer can act on. */
export interface FriendlyError {
  message: string;
  detail?: string;
}

export function mapChainError(e: unknown, context?: { tokenId?: string }): FriendlyError {
  const raw = e instanceof Error ? (e.stack ?? e.message) : String(e);
  const msg = (e instanceof Error ? e.message : String(e)) || "Something went wrong.";
  const hay = `${msg} ${raw}`.toLowerCase();
  const id = context?.tokenId ? `Move #${context.tokenId}` : "This move";

  if (hay.includes("user rejected") || hay.includes("user denied") || hay.includes("userrejected")) {
    return { message: "You cancelled the signature. Nothing was sent." };
  }
  if (hay.includes("insufficient funds") || hay.includes("insufficient balance") || hay.includes("gas required exceeds")) {
    return {
      message: "Not enough USDC for gas on Arc. Top up at faucet.circle.com and try again.",
      detail: msg,
    };
  }
  if (hay.includes("nonexistent token") || hay.includes("erc721nonexistenttoken") || hay.includes("invalid token id")) {
    return { message: `${id} does not exist on this contract.`, detail: msg };
  }
  if (hay.includes("not token owner") || hay.includes("incorrectowner") || hay.includes("caller is not token owner")) {
    return { message: `${id} is no longer held by your wallet, so it cannot be transferred.`, detail: msg };
  }
  if (hay.includes("transfer to the zero address") || hay.includes("invalidreceiver")) {
    return { message: "That recipient address cannot receive the token.", detail: msg };
  }
  if (hay.includes("royalty_failed")) {
    return {
      message: "The creator royalty leg of the payment failed — check your token balance and approval, then retry.",
      detail: msg,
    };
  }
  if (hay.includes("pay_failed")) {
    return {
      message: "The payment transfer failed. Approve the full listed price in that token and try again.",
      detail: msg,
    };
  }
  if (hay.includes("not_listed") || hay.includes("seller_moved")) {
    return { message: `${id} is no longer available at that listing. Refresh the marketplace.`, detail: msg };
  }
  if (hay.includes("chain mismatch") || hay.includes("does not match the target chain")) {

    return { message: "Your wallet is on the wrong network. Switch to Arc Testnet and retry.", detail: msg };
  }
  if (hay.includes("failed to fetch") || hay.includes("network request failed") || hay.includes("timeout")) {
    return { message: "Arc did not respond in time. Check the receipt on Arcscan before retrying.", detail: msg };
  }
  return { message: msg.split("\n")[0]!.slice(0, 160), detail: msg };
}
