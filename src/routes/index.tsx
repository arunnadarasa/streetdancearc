import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { PrivyRoot } from "@/components/PrivyRoot";
import { Header } from "@/components/dance/Header";
import { MoveRegistry } from "@/components/dance/MoveRegistry";
import { FeaturedMerch } from "@/components/shop/FeaturedMerch";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { GxHome } from "@/components/gx/GxHome";
import { Section, SectionHead } from "@/components/layout/Section";
import { Reveal } from "@/components/layout/Reveal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useGxMode } from "@/lib/gx-mode";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/")({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { title: "StreetKode Fam — Street Dance Merch, Paid in Stablecoins" },
      {
        name: "description",
        content:
          "Streetwear built for cyphers and battles — sneakers, snapbacks, jackets and tees. Checkout in USDC, EURC or cirBTC on Circle's Arc, plus an on-chain marketplace for dance moves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "StreetKode Fam — Street Dance Merch, Paid in Stablecoins" },
      {
        property: "og:description",
        content:
          "Streetwear built for cyphers and battles — sneakers, snapbacks, jackets and tees. Checkout in USDC, EURC or cirBTC on Circle's Arc, plus an on-chain marketplace for dance moves.",
      },
    ],
  }),
  component: Index,
});

const STATS = [
  { k: "7", v: "Pieces in the current drop" },
  { k: "3", v: "Stablecoins accepted at checkout" },
  { k: "x402", v: "Agent checkout, no card needed" },
  { k: "On-chain", v: "Rights records for every move" },
];

const STEPS = [
  {
    n: "01",
    t: "Pick your piece",
    d: "Sneakers, snapbacks, jackets, tees, socks and bandanas — cut for cyphers, battles and everyday flex.",
  },
  {
    n: "02",
    t: "Pay in stablecoins",
    d: "Checkout in USDC, EURC or cirBTC. Gas is USDC on Arc, so there's no second asset to top up.",
  },
  {
    n: "03",
    t: "The move travels with it",
    d: "Every drop is tied to choreography with an on-chain rights record, so the creators behind the move get paid too.",
  },
];

function Index() {
  useCartSync();
  const { privyAppId, treasuryAddress } = Route.useLoaderData();
  const [mode] = useGxMode();

  return (
    <PrivyRoot appId={privyAppId}>
      <div className="min-h-screen bg-background text-foreground">
        <Header extra={mode === "h2h" ? <CartDrawer /> : undefined} />

        {mode === "gx" ? (
          <Section tone="base" lines>
            <GxHome />
          </Section>
        ) : (
          <>
            {/* HERO */}
            <section className="aurora-bg relative">
              <div className="rail relative flex min-h-[60vh] flex-col justify-center py-12 sm:min-h-[78vh] sm:py-28">
                <Reveal>
                  <p className="eyebrow">Streetwear &middot; Street dance &middot; Stablecoins</p>
                </Reveal>
                <Reveal delay={90}>
                  <h1 className="display mt-4 text-[clamp(2.25rem,9vw,3.25rem)] leading-[0.92] sm:mt-5 sm:text-7xl sm:leading-[0.88] lg:text-[5.5rem]">
                    <span className="block text-foreground">Wear the</span>
                    <span className="block text-gradient">culture.</span>
                    <span className="block text-foreground">Own the move.</span>
                  </h1>
                </Reveal>
                <Reveal delay={180}>
                  <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:mt-7 sm:text-lg">
                    Street dance streetwear built for cyphers and battles — checkout in USDC,
                    EURC or cirBTC on Circle&apos;s Arc. Every drop is backed by a marketplace
                    for the moves behind it.
                  </p>
                </Reveal>
                <Reveal delay={260}>
                  <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                      to="/shop"
                      className="lift rounded-full bg-linear-to-r from-primary to-glow px-7 py-3.5 text-center text-sm font-bold text-primary-foreground shadow-glow"
                    >
                      Shop the drop
                    </Link>
                    <Link
                      to="/moves"
                      className="lift rounded-full border border-border bg-surface/60 px-7 py-3.5 text-center text-sm font-bold text-foreground backdrop-blur"
                    >
                      Marketplace for moves →
                    </Link>
                  </div>
                </Reveal>

                <Reveal delay={340}>
                  <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 sm:mt-14 lg:grid-cols-4">
                    {STATS.map((s) => (
                      <div key={s.k} className="bg-surface-2/90 px-3.5 py-4 backdrop-blur sm:px-6 sm:py-6">
                        <dt className="display text-lg text-foreground sm:text-2xl">{s.k}</dt>
                        <dd className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                          {s.v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              </div>
            </section>

            {/* FEATURED MERCH */}
            <Section tone="raised" lines>
              <Reveal>
                <SectionHead
                  eyebrow="The drop"
                  title="Fresh off the rack"
                  blurb="Physical goods, Shopify-fulfilled, settled in stablecoins. Agents can buy the same catalogue over x402."
                />
              </Reveal>
              <div className="mt-10">
                <FeaturedMerch count={4} />
              </div>
            </Section>

            {/* HOW IT WORKS */}
            <Section tone="base" lines>
              <Reveal>
                <SectionHead
                  eyebrow="The flow"
                  title="Three moves from rack to receipt"
                  blurb="No token gymnastics, no bridging, no gas asset to top up. Just stablecoins and a verifiable record."
                />
              </Reveal>
              <div className="mt-12 grid gap-5 md:grid-cols-3">
                {STEPS.map((s, i) => (
                  <Reveal key={s.n} delay={i * 110}>
                    <article className="lift group relative h-full overflow-hidden rounded-3xl border border-border bg-card/70 p-7">
                      <span className="display absolute -right-3 -top-5 text-7xl text-primary/15 transition-colors group-hover:text-primary/30">
                        {s.n}
                      </span>
                      <h3 className="display relative text-xl text-foreground">{s.t}</h3>
                      <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
                        {s.d}
                      </p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </Section>

            {/* MOVE REGISTRY — secondary */}
            <Section id="register" tone="raised">
              <MoveRegistry treasuryAddress={treasuryAddress} />
            </Section>
          </>
        )}

        <SiteFooter />
      </div>
    </PrivyRoot>
  );
}
