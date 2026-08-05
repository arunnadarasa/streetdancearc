import { useCallback, useEffect, useState } from "react";

export type GxMode = "h2h" | "h2a" | "a2a" | "a2h";

const KEY = "gx.mode";
const EVENT = "gx-mode-change";

function normalize(value: string | null): GxMode | null {
  if (value === "h2h" || value === "h2a" || value === "a2a" || value === "a2h") return value;
  // Legacy: the old two-way toggle called the agent view "gx".
  if (value === "gx") return "a2a";
  return null;
}

function read(): GxMode {
  if (typeof window === "undefined") return "h2h";
  const fromUrl = normalize(new URLSearchParams(window.location.search).get("mode"));
  if (fromUrl) return fromUrl;
  return normalize(window.localStorage.getItem(KEY)) ?? "h2h";
}

/**
 * Global interface mode: H2H (human UX), H2A (human delegates to an agent),
 * A2A (agent-to-agent with x402) and A2H (an agent initiates, a human is the
 * endpoint). Persisted to localStorage and reflected in the URL as ?mode=h2a /
 * ?mode=a2a / ?mode=a2h so a judge can be linked straight into a view.
 * Legacy ?mode=gx links resolve to A2A.
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
    if (next === "h2h") url.searchParams.delete("mode");
    else url.searchParams.set("mode", next);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [mode, update];
}
