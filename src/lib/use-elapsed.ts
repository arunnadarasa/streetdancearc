import { useEffect, useState } from "react";

/** Format elapsed seconds as `Xs` or `Xm Ys`. */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

/**
 * Live elapsed timer while `active` is true.
 * Resets to 0 when deactivated.
 */
export function useElapsed(active: boolean): { seconds: number; label: string } {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    setSeconds(0);
    const started = Date.now();
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

  return { seconds, label: formatElapsed(seconds) };
}
