import { useEffect } from "react";
import { SETTLE_TOKEN_KEYS, TOKENS, type TokenKey } from "@/lib/tokens";

export function TokenSwitcher({ value, onChange }: { value: TokenKey; onChange: (t: TokenKey) => void }) {
  const options = SETTLE_TOKEN_KEYS;
  const sole = options.length === 1 ? options[0] : null;

  useEffect(() => {
    if (sole && value !== sole) onChange(sole);
  }, [sole, value, onChange]);

  if (sole) {
    return (
      <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        {TOKENS[sole].symbol}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((k) => {
        const active = TOKENS[k].symbol === TOKENS[value].symbol;
        return (
          <button
            key={k}
            type="button"
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
