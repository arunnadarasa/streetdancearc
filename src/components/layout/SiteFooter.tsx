import { FxPriceWidget } from "@/components/fx/FxPriceWidget";
import { INDEXER_URL } from "@/lib/tokens";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border bg-surface-2">
      <div className="rail flex flex-col gap-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <p className="display text-2xl text-foreground">StreetRail</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Streetwear + move rights on{" "}
            <strong className="text-foreground">Midnight Local Undeployed</strong>. Compact
            MoveRegistry, AP2 MandateVault, UCP OrderLedger, experimental mUSDC. Writes use the
            genesis wallet (server-append); verify with the local indexer.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
            <a href="/shop" className="hover:text-foreground">
              Shop
            </a>
            <a href="/moves" className="hover:text-foreground">
              Moves
            </a>
            <a href="/judge" className="hover:text-foreground">
              Judge run
            </a>
            <a href="/deck" className="hover:text-foreground">
              Deck
            </a>
            <a
              href={INDEXER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Indexer
            </a>
            <a
              href="https://github.com/arunnadarasa/streetdancearc"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <a href="/.well-known/agent-card.json" className="hover:text-foreground">
              Agent card
            </a>
          </div>
          <FxPriceWidget />
        </div>
      </div>
    </footer>
  );
}
