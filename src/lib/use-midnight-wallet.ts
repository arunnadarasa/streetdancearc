import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

export type WalletStatus =
  | "idle"
  | "detecting"
  | "ready"
  | "connecting"
  | "connected"
  | "error";

export type DustInfo = { balance: bigint; cap: bigint } | null;

type Connector = Omit<InitialAPI, "connect"> & {
  connect: (networkId: string) => Promise<ConnectedAPI>;
};

function pickConnector(): Connector | null {
  if (typeof window === "undefined") return null;
  const m = (window as unknown as { midnight?: Record<string, Connector> }).midnight;
  if (!m) return null;
  for (const v of Object.values(m)) {
    if (v && typeof v === "object" && "apiVersion" in v && /^4\./.test(String(v.apiVersion))) {
      return v as Connector;
    }
  }
  const first = Object.values(m)[0];
  return first && "apiVersion" in first ? (first as Connector) : null;
}

async function readUnshieldedAddress(api: ConnectedAPI): Promise<string | null> {
  if (typeof api.getUnshieldedAddress !== "function") return null;
  try {
    const u = await api.getUnshieldedAddress();
    return typeof u === "string"
      ? u
      : ((u as { unshieldedAddress?: string })?.unshieldedAddress ?? null);
  } catch {
    return null;
  }
}

async function readDust(api: ConnectedAPI): Promise<DustInfo> {
  if (typeof (api as { getDustBalance?: unknown }).getDustBalance !== "function") return null;
  try {
    const d = await (
      api as unknown as { getDustBalance: () => Promise<{ balance: bigint; cap: bigint }> }
    ).getDustBalance();
    const toBig = (v: unknown): bigint => {
      if (typeof v === "bigint") return v;
      if (typeof v === "number") return BigInt(Math.trunc(v));
      if (typeof v === "string") return BigInt(v);
      return 0n;
    };
    return { balance: toBig(d?.balance), cap: toBig(d?.cap) };
  } catch {
    return null;
  }
}

export function useMidnightWallet() {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [unshieldedAddress, setUnshieldedAddress] = useState<string | null>(null);
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dust, setDust] = useState<DustInfo>(null);
  const [tick, setTick] = useState(0);
  const apiRef = useRef<ConnectedAPI | null>(null);
  apiRef.current = api;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStatus((p) => (p === "connected" ? p : "detecting"));
    setError(null);
    const t0 = Date.now();
    const iv = window.setInterval(() => {
      const c = pickConnector();
      if (c) {
        window.clearInterval(iv);
        setApiVersion(c.apiVersion);
        setStatus((p) => (p === "connected" ? p : "ready"));
        if (!/^4\./.test(c.apiVersion)) {
          setStatus("error");
          setError(`Lace connector ${c.apiVersion} is not compatible. Update Lace.`);
        }
      } else if (Date.now() - t0 > 800) {
        window.clearInterval(iv);
        // On Undeployed, Lace is optional — server-append still works.
        const net = (import.meta.env.VITE_NETWORK_ID as string) || "undeployed";
        if (net === "undeployed") {
          setStatus("ready");
          setError(null);
        } else {
          setStatus("error");
          setError("No Midnight wallet detected. Install Lace from lace.io.");
        }
      }
    }, 100);
    return () => window.clearInterval(iv);
  }, [tick]);

  const refreshDust = useCallback(async () => {
    const current = apiRef.current;
    if (!current) return;
    const d = await readDust(current);
    setDust(d);
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      setStatus("connecting");
      const c = pickConnector();
      if (!c) {
        // Undeployed: allow a pseudo-connect so checkout can proceed via server-append.
        const net = (import.meta.env.VITE_NETWORK_ID as string) || "undeployed";
        if (net === "undeployed") {
          setNetwork("undeployed");
          setAddress("mn_addr_undeployed1qqqqserverappend");
          setUnshieldedAddress("mn_addr_undeployed1qqqqserverappend");
          setStatus("connected");
          return;
        }
        throw new Error("No Midnight wallet detected.");
      }
      const preferred = (import.meta.env.VITE_NETWORK_ID as string) || "undeployed";
      const candidates = Array.from(new Set([preferred, "undeployed", "preview", "preprod"]));
      let connectedApi: ConnectedAPI | null = null;
      let used: string | null = null;
      let lastErr: unknown;
      for (const n of candidates) {
        try {
          connectedApi = await c.connect(n);
          used = n;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!connectedApi) throw lastErr ?? new Error("Lace connect failed");
      const shielded =
        typeof connectedApi.getShieldedAddress === "function"
          ? await connectedApi.getShieldedAddress().catch(() => null)
          : null;
      const unshielded = await readUnshieldedAddress(connectedApi);
      setApi(connectedApi);
      setNetwork(used);
      setAddress(
        (typeof shielded === "string" ? shielded : null) || unshielded || "connected",
      );
      setUnshieldedAddress(unshielded);
      setStatus("connected");
      if (used !== "undeployed") {
        setDust(await readDust(connectedApi));
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const disconnect = useCallback(() => {
    setApi(null);
    setAddress(null);
    setUnshieldedAddress(null);
    setDust(null);
    setNetwork(null);
    setStatus("ready");
    setTick((t) => t + 1);
  }, []);

  return {
    status,
    address,
    unshieldedAddress,
    api,
    apiVersion,
    network,
    error,
    dust,
    connect,
    disconnect,
    refreshDust,
  };
}
