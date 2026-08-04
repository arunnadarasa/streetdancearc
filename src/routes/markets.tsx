import { createFileRoute, Link } from "@tanstack/react-router";
import {
  checkoutComparison,
  dataNote,
  launchMarkets,
  sizing,
  watchlist,
} from "@/data/markets";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Target Markets — Why USDC-First for Street Dance Commerce" },
      {
        name: "description",
        content:
          "Where volatile national currencies make USDC checkout the better rail: Nigeria, the Philippines, Argentina, South Africa and Turkey, with inflation, adoption and remittance data.",
      },
      { property: "og:title", content: "Target Markets — Why USDC-First" },
      {
        property: "og:description",
        content:
          "Nigeria, Philippines, Argentina, South Africa, Turkey. Inflation, stablecoin adoption and what a USDC checkout unlocks that a card cannot.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://streetdancearc.lovable.app/markets" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://streetdancearc.lovable.app/markets" }],
  }),
  component: MarketsPage,
});

const GREEN = "#1DB954";

function MarketsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
      <Link
        to="/"
        className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 hover:text-white"
      >
        ← Back
      </Link>

      <p
        className="mt-8 text-[10px] font-black uppercase tracking-[0.25em] sm:text-xs"
        style={{ color: GREEN }}
      >
        Market opportunity
      </p>
      <h1 className="mt-3 text-3xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl">
        Where the money
        <br />
        <span style={{ color: GREEN }}>loses value faster</span>
        <br />
        than the culture does.
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-neutral-300 sm:text-lg">
        Street dance travels through exactly the countries where the local currency
        does not hold. A dancer in Lagos can go viral worldwide and still be unable
        to check out on a global store, or receive a royalty that keeps its value
        for a month. A dollar-denominated rail is not a crypto flourish here — it is
        the only version of this product that works.
      </p>

      {/* Sizing */}
      <section className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-4">
        {sizing.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
          >
            <div className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {s.value}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400 sm:text-sm">
              {s.label}
            </p>
          </div>
        ))}
      </section>

      {/* Launch markets */}
      <section className="mt-12 sm:mt-20">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
          Five launch markets
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Ranked on macro instability, existing stablecoin adoption, and the size of
          the local dance and streetwear scene.
        </p>

        <div className="mt-6 space-y-4">
          {launchMarkets.map((m, i) => (
            <article
              key={m.country}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  {i + 1}. {m.country}
                </h3>
                <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-[10px] font-bold text-neutral-300 sm:text-xs">
                  {m.currency}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Inflation", m.inflation],
                  ["3-yr vs USD", `−${m.depreciation.replace("~", "")}`],
                  ["Population", m.population],
                  ["Median age", m.medianAge],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                      {k}
                    </dt>
                    <dd className="mt-1 text-base font-black text-white sm:text-lg">{v}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-sm leading-relaxed text-neutral-200">
                <span className="font-bold" style={{ color: GREEN }}>
                  What USDC fixes ·{" "}
                </span>
                {m.usdcFixes}
              </p>

              <div className="mt-4 grid gap-3 text-xs leading-relaxed text-neutral-400 sm:grid-cols-2 sm:text-sm">
                <p>
                  <span className="font-bold text-neutral-200">Culture · </span>
                  {m.culture}
                </p>
                <p>
                  <span className="font-bold text-neutral-200">Rules · </span>
                  {m.regulation}
                </p>
                <p>
                  <span className="font-bold text-neutral-200">On/off-ramps · </span>
                  {m.ramps}
                </p>
                <p>
                  <span className="font-bold text-neutral-200">Adoption · </span>
                  {m.cryptoIndex}
                </p>
              </div>

              <p className="mt-4 rounded-xl border border-neutral-800 bg-black/40 p-3 text-xs text-neutral-400 sm:text-sm">
                <span className="font-bold text-[#E63946]">Main risk · </span>
                {m.risk}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mt-12 sm:mt-20">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
          Card checkout vs USDC checkout
        </h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800">
          {checkoutComparison.map((row, i) => (
            <div
              key={row.dimension}
              className={`grid gap-1 p-4 sm:grid-cols-[130px_1fr_1fr] sm:gap-4 sm:p-5 ${
                i % 2 ? "bg-neutral-950" : "bg-black"
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 sm:text-xs">
                {row.dimension}
              </div>
              <div className="text-xs text-neutral-400 sm:text-sm">
                <span className="font-bold text-neutral-500 sm:hidden">Card · </span>
                {row.card}
              </div>
              <div className="text-xs text-neutral-100 sm:text-sm">
                <span className="font-bold sm:hidden" style={{ color: GREEN }}>
                  USDC ·{" "}
                </span>
                {row.usdc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Watchlist */}
      <section className="mt-12 sm:mt-20">
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
          Watchlist
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {watchlist.map((w) => (
            <div
              key={w.country}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-black text-white">{w.country}</span>
                <span className="text-[10px] font-bold text-neutral-500">{w.currency}</span>
                <span className="ml-auto text-sm font-black" style={{ color: GREEN }}>
                  {w.inflation}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">{w.note}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 rounded-xl border border-neutral-800 p-4 text-[11px] leading-relaxed text-neutral-500 sm:mt-14 sm:text-xs">
        {dataNote}
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          to="/shop"
          className="rounded-full bg-white px-5 py-3 text-xs font-bold text-black hover:bg-neutral-200"
        >
          Shop the merch →
        </Link>
        <Link
          to="/deck"
          className="rounded-full border border-neutral-700 px-5 py-3 text-xs font-bold text-white hover:bg-neutral-900"
        >
          See the deck
        </Link>
      </div>
    </main>
    </div>
  );
}
