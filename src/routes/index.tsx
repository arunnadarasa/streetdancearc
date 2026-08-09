import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { PrivyRoot } from "@/components/PrivyRoot";
import { Header } from "@/components/dance/Header";
import { MoveRegistry } from "@/components/dance/MoveRegistry";
import { FeaturedMerch } from "@/components/shop/FeaturedMerch";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { GxHome } from "@/components/gx/GxHome";
import { ModeSurface } from "@/components/gx/ModeSurface";
import { Section, SectionHead } from "@/components/layout/Section";
import { Reveal } from "@/components/layout/Reveal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useGxMode } from "@/lib/gx-mode";
import { H2aHome } from "@/components/h2a/H2aHome";
import { A2hHome } from "@/components/a2h/A2hHome";
import { getPublicConfig } from "@/lib/config.functions";
import { LiveMetrics } from "@/components/home/LiveMetrics";
import { WhyArc } from "@/components/home/WhyArc";


export const Route = createFileRoute("/")({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { title: "StreetRail — Street Dance Merch, Paid in Stablecoins" },
      {
        name: "description",
        content:
          "Streetwear built for cyphers and battles — sneakers, snapbacks, jackets and tees. Checkout in USDC, EURC or cirBTC on Circle's Arc, plus an on-chain marketplace for dance moves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "StreetRail — Street Dance Merch, Paid in Stablecoins" },
      {
        property: "og:description",
        content:
          "Streetwear built for cyphers and battles — sneakers, snapbacks, jackets and tees. Checkout in USDC, EURC or cirBTC on Circle's Arc, plus an on-chain marketplace for dance moves.",
      },
    ],
  }),
  component: Index,
});

const THESIS =
  "Streetwear checkout and dance-move royalties, settled in stablecoins on Circle's Arc — where a $0.001 payment is worth making because gas is a rounding error and paid in the same asset.";



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

        <ModeSurface mode={mode} agent={<GxHome />}>
          <>
            {/* HERO */}
            <section className="aurora-bg relative">
              <div className="rail relative flex min-h-[60vh] flex-col justify-center py-12 sm:min-h-[78vh] sm:py-28 lg:min-h-[88svh] lg:py-16">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
                  <div>
                    <Reveal>
                      <p className="eyebrow">Streetwear &middot; Street dance &middot; Stablecoins</p>
                    </Reveal>
                    <Reveal delay={40}>
                      <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-glow sm:text-base">
                        {THESIS}
                      </p>
                    </Reveal>

                    <Reveal delay={90}>
                      <h1 className="display mt-4 text-[clamp(2.25rem,9vw,3.25rem)] leading-[0.92] sm:mt-5 sm:text-7xl sm:leading-[0.88] lg:text-[4.75rem] xl:text-[5.5rem]">
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
                          to="/judge"
                          className="lift rounded-full border border-glow/40 bg-glow/10 px-7 py-3.5 text-center text-sm font-bold text-foreground backdrop-blur"
                        >
                          Judge run: all four modes →
                        </Link>
                        <Link
                          to="/moves"
                          className="lift rounded-full border border-border bg-surface/60 px-7 py-3.5 text-center text-sm font-bold text-foreground backdrop-blur"
                        >
                          Marketplace for moves →
                        </Link>
                      </div>
                    </Reveal>
                  </div>

                  <Reveal delay={340}>
                    <LiveMetrics />
                  </Reveal>

                </div>
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

            {/* WHY ARC */}
            <Section tone="deep" lines>
              <Reveal>
                <WhyArc />
              </Reveal>
            </Section>



            {/* PRIMER TEASER */}
            <Section tone="deep" innerClassName="py-10 sm:py-14">
              <Reveal>
                <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-glow/30 bg-glow/10 p-6 sm:flex-row sm:items-center sm:p-8">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-glow">New to web3?</p>
                    <h3 className="display mt-2 text-xl text-foreground sm:text-2xl">
                      Read the StreetRail Primer
                    </h3>
                    <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                      Blockchain, agents, x402 and stablecoins — explained in dance terminology.
                    </p>
                  </div>
                  <Link
                    to="/primer"
                    className="lift inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-linear-to-r from-primary to-glow px-6 text-sm font-black text-primary-foreground shadow-glow-sm"
                  >
                    Open the primer →
                  </Link>
                </div>
              </Reveal>
            </Section>

            {/* MOVE REGISTRY — secondary */}
            <Section id="register" tone="raised">
              <MoveRegistry treasuryAddress={treasuryAddress} />
            </Section>
          </>
        </ModeSurface>


        <SiteFooter />
      </div>
    </PrivyRoot>
  );
}
