import { TOKENS, type TokenKey } from "@/lib/tokens";

export function TokenSwitcher({ value, onChange }: { value: TokenKey; onChange: (t: TokenKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(TOKENS) as TokenKey[]).map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={
              "rounded-full px-4 py-2 text-sm font-semibold transition " +
              (active
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:bg-secondary")
            }
          >
            {TOKENS[k].symbol}
          </button>
        );
      })}
    </div>
  );
}
