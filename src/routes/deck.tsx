import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "Judges Deck · Dance Move Tokens" },
      { name: "description", content: "Pitch deck for Dance Move Tokens — Encode × Arc Programmable Money Hackathon." },
      { property: "og:title", content: "Judges Deck · Dance Move Tokens" },
      { property: "og:description", content: "Pitch deck for Dance Move Tokens — Encode × Arc Programmable Money Hackathon." },
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
              Open PDF ↗
            </a>
            <a
              href="/judges-deck.pdf"
              download
              className="rounded-full bg-white px-3 py-2 text-xs font-bold text-black hover:bg-neutral-200"
            >
              Download PDF
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

        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
          <object
            data="/judges-deck.pdf#view=FitH"
            type="application/pdf"
            className="h-[80vh] w-full"
            aria-label="Dance Move Tokens judges deck"
          >
            <div className="p-6 text-sm text-neutral-400">
              Your browser can't display the PDF inline.{" "}
              <a href="/judges-deck.pdf" className="text-[#1DB954] underline">
                Open it in a new tab
              </a>
              .
            </div>
          </object>
        </div>
      </div>
    </div>
  );
}
