import { useCallback, useEffect, useState } from "react";
import { isTokenKey, type TokenKey } from "@/lib/tokens";

const KEY = "streetrail.payToken";
const EVENT = "pay-token-change";

function read(): TokenKey {
  if (typeof window === "undefined") return "USDC";
  const fromUrl = new URLSearchParams(window.location.search).get("pay");
  if (isTokenKey(fromUrl)) return fromUrl;
  const stored = window.localStorage.getItem(KEY);
  return isTokenKey(stored) ? stored : "USDC";
}

/**
 * The settlement currency, shared by all four interface modes. Mirrors the
 * gx-mode pattern: localStorage plus a ?pay= search param so a judge can be
 * linked straight into "A2A paying in cirBTC". Always USDC during SSR — the
 * switch happens after hydration.
 */
export function usePayToken(): [TokenKey, (t: TokenKey) => void] {
  const [token, setToken] = useState<TokenKey>("USDC");

  useEffect(() => {
    setToken(read());
    const onChange = () => setToken(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("popstate", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("popstate", onChange);
    };
  }, []);

  const update = useCallback((next: TokenKey) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, next);
    const url = new URL(window.location.href);
    if (next === "USDC") url.searchParams.delete("pay");
    else url.searchParams.set("pay", next);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [token, update];
}
