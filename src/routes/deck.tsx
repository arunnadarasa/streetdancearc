import { SiteFooter } from "@/components/layout/SiteFooter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Deck } from "@/components/deck/Deck";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "Judges Deck · StreetRail" },
      { name: "description", content: "Interactive pitch deck for StreetRail — Encode × Arc Programmable Money Hackathon." },
      { property: "og:title", content: "Judges Deck · StreetRail" },
      { property: "og:description", content: "Interactive pitch deck for StreetRail — Encode × Arc Programmable Money Hackathon." },
    ],
  }),
  component: DeckPage,
});

function DeckPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="aurora-bg">
        <div className="rail flex flex-col gap-6 py-8 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Encode × Arc · Programmable Money Hackathon</p>
              <h1 className="display mt-3 text-[clamp(1.75rem,7vw,2.25rem)] sm:text-5xl">Judges Deck</h1>
            </div>
            <div className="grid grid-cols-3 items-center gap-2 sm:flex sm:flex-wrap">
              <Link
                to="/"
                className="min-h-11 rounded-full border border-border bg-surface/60 px-3 py-2.5 text-center text-xs font-bold backdrop-blur hover:bg-secondary sm:px-4"
              >
                ← Back
              </Link>
              <a
                href="/judges-deck.pdf"
                target="_blank"
                rel="noreferrer"
                className="min-h-11 rounded-full border border-border bg-surface/60 px-3 py-2.5 text-center text-xs font-bold backdrop-blur hover:bg-secondary sm:px-4"
              >
                PDF ↗
              </a>
              <a
                href="/judges-deck.pptx"
                download
                className="lift min-h-11 rounded-full bg-linear-to-r from-primary to-glow px-3 py-2.5 text-center text-xs font-bold text-primary-foreground shadow-glow-sm sm:px-4"
              >
                PPTX
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


