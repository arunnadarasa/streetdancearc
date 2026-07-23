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
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">Judges Deck</h1>
            <p className="text-xs text-neutral-500">
              Encode × Arc · Programmable Money Hackathon
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-full border border-neutral-700 px-3 py-2 text-xs font-bold hover:bg-neutral-900"
            >
              ← Back
            </Link>
            <a
              href="/judges-deck.pdf"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-neutral-700 px-3 py-2 text-xs font-bold hover:bg-neutral-900"
            >
              PDF version ↗
            </a>
            <a
              href="/judges-deck.pptx"
              download
              className="rounded-full bg-[#1DB954] px-3 py-2 text-xs font-bold text-black hover:brightness-110"
            >
              Download PPTX
            </a>
          </div>
        </div>

        <Deck />
      </div>
    </div>
  );
}

