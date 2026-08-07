import { useGxMode, type GxMode } from "@/lib/gx-mode";

const OPTIONS: Array<{ value: GxMode; label: string; hint: string }> = [
  { value: "h2h", label: "H2H", hint: "Human interface (UX)" },
  { value: "h2a", label: "H2A", hint: "Human delegates to an agent (GX)" },
  { value: "a2a", label: "A2A", hint: "Agent-to-agent with x402" },
  { value: "a2h", label: "A2H", hint: "Agent initiates, human is the endpoint" },
];

export function ModeToggle({
  className = "",
  full = false,
}: {
  className?: string;
  /** Stretch to the container width with evenly sized buttons (mobile strip). */
  full?: boolean;
}) {
  const [mode, setMode] = useGxMode();

  return (
    <div
      role="group"
      aria-label="Interface mode"
      className={`${
        full ? "flex w-full" : "inline-flex shrink-0"
      } items-center rounded-full border border-border bg-background/60 p-0.5 ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setMode(o.value)}
          title={o.hint}
          aria-pressed={mode === o.value}
          className={`whitespace-nowrap rounded-full font-black tracking-wide transition ${
            full
              ? "h-10 flex-1 text-xs"
              : "px-2 py-1.5 text-[10px] sm:px-2.5 sm:text-[11px]"
          } ${
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
