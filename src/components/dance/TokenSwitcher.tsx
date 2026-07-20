import { TOKENS, type TokenKey } from "@/lib/tokens";

const ZERO = "0x0000000000000000000000000000000000000000";

export function TokenSwitcher({ value, onChange }: { value: TokenKey; onChange: (t: TokenKey) => void }) {
  return (
    <div className="flex gap-2">
      {(Object.keys(TOKENS) as TokenKey[]).map((k) => {
        const active = k === value;
        const disabled = TOKENS[k].address.toLowerCase() === ZERO;
        return (
          <button
            key={k}
            onClick={() => !disabled && onChange(k)}
            disabled={disabled}
            title={disabled ? "Set VITE_CIRBTC_ADDRESS to enable" : undefined}
            className={
              "rounded-full px-4 py-2 text-sm font-semibold transition " +
              (disabled
                ? "cursor-not-allowed bg-neutral-900 text-neutral-600 line-through"
                : active
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
