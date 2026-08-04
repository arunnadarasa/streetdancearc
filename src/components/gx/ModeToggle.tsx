import { useGxMode, type GxMode } from "@/lib/gx-mode";

const OPTIONS: Array<{ value: GxMode; label: string; hint: string }> = [
  { value: "h2h", label: "H2H", hint: "Human interface" },
  { value: "gx", label: "GX", hint: "Agent interface" },
];

export function ModeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useGxMode();

  return (
    <div
      role="group"
      aria-label="Interface mode"
      className={`inline-flex shrink-0 items-center rounded-full border border-neutral-700 bg-black/60 p-0.5 ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setMode(o.value)}
          title={o.hint}
          aria-pressed={mode === o.value}
          className={`rounded-full px-3 py-1.5 text-[11px] font-black tracking-wide transition ${
            mode === o.value
              ? "bg-[#1DB954] text-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
