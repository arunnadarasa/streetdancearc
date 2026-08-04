export function SiteFooter() {
  return (
    <footer className="relative border-t border-border bg-surface-2">
      <div className="rail flex flex-col gap-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <p className="display text-2xl text-foreground">Dance Move Tokens</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Built during the Creative AI &amp; Quantum Hackathon organised by StreetKode Fam
            during Indian Krump Festival 14. Running on Circle&apos;s Arc Testnet.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
          <a href="/shop" className="hover:text-foreground">Shop</a>
          <a href="/markets" className="hover:text-foreground">Markets</a>
          <a href="/deck" className="hover:text-foreground">Deck</a>
          <a
            href="/.well-known/agent-card.json"
            className="hover:text-foreground"
          >
            Agent card
          </a>
        </div>
      </div>
    </footer>
  );
}
