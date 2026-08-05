import { createContext, useContext } from "react";

export type WalletUser = { wallet?: { address?: string } } | null;
export type WalletLike = {
  address?: string;
  walletClientType?: string;
  getEthereumProvider: () => Promise<unknown>;
};

export type WalletApi = {
  /** false when no Privy app ID could be resolved — wallet features are disabled. */
  available: boolean;
  ready: boolean;
  authenticated: boolean;
  user: WalletUser;
  wallets: WalletLike[];
  login: () => Promise<void> | void;
  logout: () => Promise<void> | void;
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
};

export const WalletContext = createContext<WalletApi>(WALLET_UNAVAILABLE);

export function useWallet(): WalletApi {
  return useContext(WalletContext);
}
