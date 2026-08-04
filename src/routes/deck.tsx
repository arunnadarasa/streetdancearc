import { SiteFooter } from "@/components/layout/SiteFooter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Deck } from "@/components/deck/Deck";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "Judges Deck · Dance Move Tokens" },
      { name: "description", content: "Interactive pitch deck for Dance Move Tokens — Encode × Arc Programmable Money Hackathon." },
      { property: "og:title", content: "Judges Deck · Dance Move Tokens" },
      { property: "og:description", content: "Interactive pitch deck for Dance Move Tokens — Encode × Arc Programmable Money Hackathon." },
    ],
  }),
  component: DeckPage,
});

function DeckPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="aurora-bg">
        <div className="rail flex flex-col gap-6 py-8 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">Encode × Arc · Programmable Money Hackathon</p>
              <h1 className="display mt-3 text-[clamp(1.75rem,7vw,2.25rem)] sm:text-5xl">Judges Deck</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/"
                className="rounded-full border border-border bg-surface/60 px-4 py-2.5 text-xs font-bold backdrop-blur hover:bg-secondary"
              >
                ← Back
              </Link>
              <a
                href="/judges-deck.pdf"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border bg-surface/60 px-4 py-2.5 text-xs font-bold backdrop-blur hover:bg-secondary"
              >
                PDF version ↗
              </a>
              <a
                href="/judges-deck.pptx"
                download
                className="lift rounded-full bg-linear-to-r from-primary to-glow px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow-sm"
              >
                Download PPTX
              </a>
            </div>
          </div>

          <Deck />
        </div>
      </div>
      <SiteFooter />
    </div>

  );
}


