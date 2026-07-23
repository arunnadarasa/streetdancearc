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
        className="relative w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
        style={{ aspectRatio: "16 / 9" }}
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

      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-900">
        <div
          className="h-full bg-[#1DB954] transition-all"
          style={{ width: `${((i + 1) / total) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={prev}
          disabled={i === 0}
          className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-900 disabled:opacity-40"
        >
          ← Prev
        </button>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => go(idx)}
              className={`h-2 w-2 rounded-full transition ${
                idx === i ? "bg-[#1DB954]" : "bg-neutral-700 hover:bg-neutral-500"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={i === total - 1}
          className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200 disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      <div className="text-center text-[11px] text-neutral-500">
        {i + 1} / {total} · ← → to navigate · swipe on mobile
      </div>
    </div>
  );
}
