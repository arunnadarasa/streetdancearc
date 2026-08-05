import { useCallback, useEffect, useRef, useState } from "react";
import { slides } from "./slides";

export function Deck() {
  const [i, setI] = useState(0);
  const total = slides.length;
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (n: number) => setI((cur) => Math.max(0, Math.min(total - 1, n))),
    [total],
  );
  const prev = useCallback(() => go(i - 1), [go, i]);
  const next = useCallback(() => go(i + 1), [go, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, go, total]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-3/4 w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-surface-2 [-webkit-overflow-scrolling:touch] sm:aspect-video sm:overflow-hidden"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
          touchX.current = null;
        }}
      >
        {slides[i].render()}
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((i + 1) / total) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={prev}
          disabled={i === 0}
          className="min-h-11 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-surface disabled:opacity-40 sm:px-4 sm:py-2 sm:text-xs"
        >
          ← Prev
        </button>
        <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => go(idx)}
              className={`h-2 w-2 rounded-full transition ${
                idx === i ? "bg-primary" : "bg-muted hover:bg-glow"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-bold tabular-nums text-muted-foreground sm:hidden">
          {i + 1} of {total}
        </span>
        <button
          onClick={next}
          disabled={i === total - 1}
          className="min-h-11 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:bg-foreground/85 disabled:opacity-40 sm:px-4 sm:py-2 sm:text-xs"
        >
          Next →
        </button>
      </div>

      <div className="text-center text-[11px] text-muted-foreground">
        <span className="sm:hidden">Swipe to navigate</span>
        <span className="hidden sm:inline">
          {i + 1} / {total} · ← → to navigate
        </span>
      </div>
    </div>
  );
}
