import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export interface MarketFilterValues {
  q: string;
  cat: string;
  license: string;
  tok: string;
  sort: string;
}

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "token", label: "Payment token" },
];

interface Props {
  values: MarketFilterValues;
  disciplines: string[];
  licenses: string[];
  tokens: string[];
  shown: number;
  total: number;
  onChange: (patch: Partial<MarketFilterValues>) => void;
  onClear: () => void;
}

const chip =
  "inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-xs font-bold uppercase tracking-widest transition";

export function MarketFilters({
  values,
  disciplines,
  licenses,
  tokens,
  shown,
  total,
  onChange,
  onClear,
}: Props) {
  // Local mirror keeps typing snappy; the URL updates on a short debounce.
  const [text, setText] = useState(values.q);

  useEffect(() => {
    setText(values.q);
  }, [values.q]);

  useEffect(() => {
    if (text === values.q) return;
    const t = setTimeout(() => onChange({ q: text }), 250);
    return () => clearTimeout(t);
  }, [text, values.q, onChange]);

  const active =
    values.q.trim() !== "" ||
    values.cat !== "all" ||
    values.license !== "all" ||
    values.tok !== "all" ||
    values.sort !== "newest";

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search moves, #id, discipline or seller…"
            aria-label="Search listings"
            className="h-11 w-full min-w-0 rounded-full border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {text !== "" && (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <label className="min-w-0 shrink-0">
          <span className="sr-only">Sort listings</span>
          <select
            value={values.sort}
            onChange={(e) => onChange({ sort: e.target.value })}
            className="h-11 w-full min-w-0 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:w-auto"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {disciplines.length > 0 && (
        <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => onChange({ cat: "all" })}
            aria-pressed={values.cat === "all"}
            className={`${chip} ${
              values.cat === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {disciplines.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ cat: values.cat === d ? "all" : d })}
              aria-pressed={values.cat === d}
              className={`${chip} ${
                values.cat === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Token
          <select
            value={values.tok}
            onChange={(e) => onChange({ tok: e.target.value })}
            className="h-11 rounded-full border border-border bg-surface px-3 text-sm font-semibold normal-case tracking-normal text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All</option>
            {tokens.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {licenses.length > 0 && (
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            License
            <select
              value={values.license}
              onChange={(e) => onChange({ license: e.target.value })}
              className="h-11 rounded-full border border-border bg-surface px-3 text-sm font-semibold normal-case tracking-normal text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All</option>
              {licenses.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}

        <p className="ml-auto text-[11px] text-muted-foreground">
          {shown} of {total} listing{total === 1 ? "" : "s"}
          {active && (
            <>
              {" · "}
              <button type="button" onClick={onClear} className="font-bold text-glow hover:underline">
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
