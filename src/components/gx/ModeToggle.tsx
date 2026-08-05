import { useGxMode, type GxMode } from "@/lib/gx-mode";

const OPTIONS: Array<{ value: GxMode; label: string; hint: string }> = [
  { value: "h2h", label: "H2H", hint: "Human interface (UX)" },
  { value: "h2a", label: "H2A", hint: "Human delegates to an agent (GX)" },
  { value: "a2a", label: "A2A", hint: "Agent-to-agent with x402" },
];

export function ModeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useGxMode();

  return (
    <div
      role="group"
      aria-label="Interface mode"
      className={`inline-flex shrink-0 items-center rounded-full border border-border bg-background/60 p-0.5 ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setMode(o.value)}
          title={o.hint}
          aria-pressed={mode === o.value}
          className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-black tracking-wide transition sm:px-3 ${
            mode === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
