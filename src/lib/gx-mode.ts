import { useCallback, useEffect, useState } from "react";

export type GxMode = "h2h" | "gx";

const KEY = "gx.mode";
const EVENT = "gx-mode-change";

function read(): GxMode {
  if (typeof window === "undefined") return "h2h";
  const fromUrl = new URLSearchParams(window.location.search).get("mode");
  if (fromUrl === "gx" || fromUrl === "h2h") return fromUrl;
  return window.localStorage.getItem(KEY) === "gx" ? "gx" : "h2h";
}

/**
 * Global H2H / GX mode. Persisted to localStorage and reflected in the URL as
 * ?mode=gx so a judge can be linked straight into the agent view.
 * Always "h2h" during SSR — the switch happens after hydration.
 */
export function useGxMode(): [GxMode, (m: GxMode) => void] {
  const [mode, setMode] = useState<GxMode>("h2h");

  useEffect(() => {
    setMode(read());
    const onChange = () => setMode(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("popstate", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("popstate", onChange);
    };
  }, []);

  const update = useCallback((next: GxMode) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, next);
    const url = new URL(window.location.href);
    if (next === "gx") url.searchParams.set("mode", "gx");
    else url.searchParams.delete("mode");
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [mode, update];
}
