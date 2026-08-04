import { createFileRoute } from "@tanstack/react-router";
import { PrivyRoot } from "@/components/PrivyRoot";
import { Header } from "@/components/dance/Header";
import { TreasuryCard } from "@/components/dance/TreasuryCard";
import { MintForm } from "@/components/dance/MintForm";
import { GxHome } from "@/components/gx/GxHome";
import { Section, SectionHead } from "@/components/layout/Section";
import { Reveal } from "@/components/layout/Reveal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useGxMode } from "@/lib/gx-mode";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/")({
  loader: () => getPublicConfig(),
  component: Index,
});

const STATS = [
  { k: "5042002", v: "Arc Testnet chain ID" },
  { k: "USDC", v: "Native gas token · 6 decimals" },
  { k: "3", v: "Settlement currencies live" },
  { k: "100%", v: "On-chain rights provenance" },
];

const STEPS = [
  {
    n: "01",
    t: "Pin the rights",
    d: "Choreography metadata — creator, crew, licence terms, video hash — pinned to IPFS as JSON.",
  },
  {
    n: "02",
    t: "Log it on Arc",
    d: "One call to DanceMoveTokens writes token, amount and CID to Circle's Arc Testnet.",
  },
  {
    n: "03",
    t: "Get paid in stablecoins",
    d: "Settle in USDC, EURC or cirBTC. Gas is USDC, so no second asset to manage.",
  },
];

function Index() {
  const { privyAppId, treasuryAddress } = Route.useLoaderData();
  const [mode] = useGxMode();

  return (
    <PrivyRoot appId={privyAppId}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />

        {mode === "gx" ? (
          <Section tone="base" lines>
            <GxHome />
          </Section>
        ) : (
          <>
            {/* HERO */}
            <section className="aurora-bg relative">
              <div className="rail relative flex min-h-[78vh] flex-col justify-center py-20 sm:py-28">
                <Reveal>
                  <p className="eyebrow">Dance &middot; Choreography &middot; Programmable money</p>
                </Reveal>
                <Reveal delay={90}>
                  <h1 className="display mt-5 text-[13vw] leading-[0.88] sm:text-7xl lg:text-[5.5rem]">
                    <span className="block text-foreground">License</span>
                    <span className="block text-gradient">your moves.</span>
                    <span className="block text-foreground">Pin your rights.</span>
                  </h1>
                </Reveal>
                <Reveal delay={180}>
                  <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Create, pin and trade dance moves as on-chain rights records with IPFS
                    metadata — settled in USDC, EURC or cirBTC on Circle&apos;s Arc Testnet.
                  </p>
                </Reveal>
                <Reveal delay={260}>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <a
                      href="#register"
                      className="lift rounded-full bg-linear-to-r from-primary to-glow px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-glow"
                    >
                      Register a move
                    </a>
                    <a
                      href="/shop"
                      className="lift rounded-full border border-border bg-surface/60 px-7 py-3.5 text-sm font-bold text-foreground backdrop-blur"
                    >
                      Shop the merch →
                    </a>
                  </div>
                </Reveal>

                <Reveal delay={340}>
                  <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 lg:grid-cols-4">
                    {STATS.map((s) => (
                      <div key={s.k} className="bg-surface-2/90 px-4 py-5 backdrop-blur sm:px-6 sm:py-6">
                        <dt className="display text-xl text-foreground sm:text-2xl">{s.k}</dt>
                        <dd className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                          {s.v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              </div>
            </section>

            {/* HOW IT WORKS */}
            <Section tone="raised" lines>
              <Reveal>
                <SectionHead
                  eyebrow="The flow"
                  title="Three moves from cypher to settlement"
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

            {/* REGISTER */}
            <Section id="register" tone="base">
              <div className="grid gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-start">
                <Reveal>
                  <div className="lg:sticky lg:top-28">
                    <SectionHead
                      eyebrow="Rights registry"
                      title="Register a move"
                      blurb="Approve the stablecoin, log the CID, get an Arcscan receipt. The record is public, permanent and yours."
                    />
                    <div className="mt-8">
                      <TreasuryCard address={treasuryAddress} />
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={120}>
                  <MintForm />
                </Reveal>
              </div>
            </Section>
          </>
        )}

        <SiteFooter />
      </div>
    </PrivyRoot>
  );
}
