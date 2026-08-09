import { createContext, useContext } from "react";

export type WalletUser = { wallet?: { address?: string } } | null;
export type WalletLike = {
  address?: string;
  walletClientType?: string;
  switchChain: (chainId: number) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEthereumProvider: () => Promise<any>;
};

export type WalletApi = {
  /** false when Lace is unavailable and Undeployed server-append is the only path. */
  available: boolean;
  ready: boolean;
  authenticated: boolean;
  user: WalletUser;
  wallets: WalletLike[];
  login: () => Promise<void> | void;
  logout: () => Promise<void> | void;
  /** Midnight-specific extras (optional consumers). */
  network?: string | null;
  unshieldedAddress?: string | null;
  dustBalance?: bigint | null;
};

const noop = async () => {};

export const WALLET_UNAVAILABLE: WalletApi = {
  available: false,
  ready: true,
  authenticated: false,
  user: null,
  wallets: [],
  login: noop,
  logout: noop,
  network: null,
  unshieldedAddress: null,
  dustBalance: null,
};

/** SSR / ClientOnly fallback for Undeployed — never flash "Wallet unavailable". */
export const UNDEPLOYED_WALLET_BOOT: WalletApi = {
  available: true,
  ready: true,
  authenticated: false,
  user: null,
  wallets: [],
  login: noop,
  logout: noop,
  network: "undeployed",
  unshieldedAddress: null,
  dustBalance: null,
};

export const WalletContext = createContext<WalletApi>(UNDEPLOYED_WALLET_BOOT);

export function useWallet(): WalletApi {
  return useContext(WalletContext);
}
