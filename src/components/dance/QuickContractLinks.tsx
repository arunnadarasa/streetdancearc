import { ExternalLink } from "lucide-react";
import { CONTRACTS, shortAddress } from "@/lib/contracts";

export function QuickContractLinks({
  keys,
  className = "",
}: {
  keys: string[];
  className?: string;
}) {
  const items = keys
    .map((k) => CONTRACTS.find((c) => c.key === k))
    .filter(Boolean);

  return (
    <div className={`hidden 2xl:flex 2xl:items-center 2xl:gap-1.5 ${className}`}>
      {items.map((c) => (
        <a
          key={c!.key}
          href={c!.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-background/60 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground lg:px-3"
          title={`${c!.name} · ${c!.address}`}
        >
          <span className="hidden lg:inline">{c!.name}</span>
          <span className="font-mono lg:hidden">{shortAddress(c!.address)}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
        </a>
      ))}
    </div>
  );
}
