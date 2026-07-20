import { TOKENS, type TokenKey } from "@/lib/tokens";

export function TokenSwitcher({ value, onChange }: { value: TokenKey; onChange: (t: TokenKey) => void }) {
  return (
    <div className="flex gap-2">
      {(Object.keys(TOKENS) as TokenKey[]).map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={
              "rounded-full px-4 py-2 text-sm font-semibold transition " +
              (active
                ? "bg-[#1DB954] text-black"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800")
            }
          >
            {TOKENS[k].symbol}
          </button>
        );
      })}
    </div>
  );
}
