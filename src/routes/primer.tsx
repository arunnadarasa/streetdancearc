import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/dance/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Section, SectionHead } from "@/components/layout/Section";
import { Reveal } from "@/components/layout/Reveal";
import { ArrowRight, BookOpen } from "lucide-react";

export const Route = createFileRoute("/primer")({
  head: () => ({
    meta: [
      { title: "Primer · StreetRail — Web3 for Dancers" },
      {
        name: "description",
        content:
          "A dancer-friendly primer to StreetRail: blockchain, agents, x402, stablecoins, and the four modes explained in street-dance terms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Primer · StreetRail — Web3 for Dancers" },
      {
        property: "og:description",
        content:
          "A dancer-friendly primer to StreetRail: blockchain, agents, x402, stablecoins, and the four modes explained in street-dance terms.",
      },
    ],
  }),
  component: PrimerPage,
});

const CARDS = [
  {
    dance: "The Cypher",
    tech: "Blockchain (Arc)",
    body: "The cypher is the circle where every move is seen, in order, and can't be erased. Arc is the digital cypher: every payment and rights record is visible to all, locked in order, and permanent.",
  },
  {
    dance: "Your Signature Move",
    tech: "Transaction",
    body: "When you throw your signature, everyone knows it's you. A transaction is your digital signature move — it proves you did something on the rail and stamps it with your wallet.",
  },
  {
    dance: "The Crew",
    tech: "Agentic / Agents",
    body: "Agentic means software that acts like a trusted crew member. You give it a spend limit and a mission — shop, negotiate, or pay — and it executes without you babysitting every step.",
  },
  {
    dance: "The Setlist",
    tech: "Mandate (AP2)",
    body: "Before a battle you agree on the setlist. A mandate is the digital setlist: it tells the agent what it can spend, on what, for how long, and when it needs to ask for approval.",
  },
  {
    dance: "Four Battle Formats",
    tech: "H2H · H2A · A2A · A2H",
    body: "H2H is you browsing the shop. H2A is you telling an agent what to buy. A2A is two agents negotiating and settling alone. A2H is an agent paying choreographers automatically through a payout inbox.",
  },
  {
    dance: "The Wristband Check",
    tech: "x402",
    body: "x402 is like the bouncer checking your wristband before you enter. It means 'show me the on-chain receipt, then you get the goods.' No receipt, no entry.",
  },
  {
    dance: "Battle Money That Doesn't Bounce",
    tech: "Stablecoins",
    body: "USDC, EURC and cirBTC are digital dollars, euros and bitcoin that keep their value. A prize purse in stablecoins doesn't shrink between the battle and the bank.",
  },
  {
    dance: "The Door Fee",
    tech: "Gas",
    body: "On Arc, USDC is the door fee. You don't need a second token to post a move or buy a tee — the same stablecoin you pay with covers the network cost.",
  },
  {
    dance: "The Rights Wall",
    tech: "Move Registry",
    body: "Dancers log a choreography fingerprint on-chain. Every merch drop tied to that move inherits the credit, so the creators get paid when their style travels.",
  },
  {
    dance: "Your Dance ID",
    tech: "Wallet",
    body: "Privy gives you an embedded wallet with Google login. It's your digital dance card: it holds your stablecoins, signs your moves, and proves it's you at the door.",
  },
];

const GLOSSARY = [
  { term: "Agentic", def: "Software that can act on its own within rules you set." },
  { term: "Arc", def: "Circle's blockchain testnet where StreetRail settles. Chain ID 5042002." },
  { term: "AP2", def: "Agent Payment Protocol — a signed permission slip for automated spending." },
  { term: "Blockchain", def: "A shared, ordered ledger that nobody can unilaterally rewrite." },
  { term: "cirBTC", def: "A Circle-issued bitcoin token used as a payment option on Arc." },
  { term: "EURC", def: "A euro-backed stablecoin accepted at checkout." },
  { term: "Gas", def: "The fee paid to the network to process a transaction." },
  { term: "GX", def: "Generative Experience — an interface built for you and an agent to collaborate." },
  { term: "H2A", def: "Human-to-agent: you set intent, the agent executes." },
  { term: "H2H", def: "Human-to-human: a normal storefront experience." },
  { term: "Mandate", def: "A time-boxed, signed spending rule an agent must follow." },
  { term: "Privy", def: "The login and wallet service; sign in with Google, no seed phrase needed." },
  { term: "Receipt", def: "An on-chain proof that a payment happened." },
  { term: "Stablecoin", def: "A token pegged to a real-world currency so the price stays steady." },
  { term: "USDC", def: "A dollar-backed stablecoin and Arc's native gas token." },
  { term: "x402", def: "A protocol that turns 'Payment Required' into a machine-payable checkout." },
];

function PrimerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="aurora-bg">
        <Section innerClassName="pt-8 sm:pt-14">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">New to web3? Start here.</p>
                <h1 className="display mt-3 text-[clamp(2rem,7vw,3.5rem)] leading-[0.95] text-foreground">
                  StreetRail Primer
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                  StreetRail mixes street dance culture with programmable money. This primer
                  translates the tech into dance terms — no prior web3 knowledge needed.
                </p>
              </div>
              <Link
                to="/shop"
                className="lift inline-flex h-11 items-center gap-2 self-start rounded-full bg-linear-to-r from-primary to-glow px-5 text-sm font-black text-primary-foreground shadow-glow-sm sm:self-auto"
              >
                Browse the shop <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </Section>
      </div>

      <Section tone="raised">
        <SectionHead
          eyebrow="Concept cards"
          title="Dance term ↔ Web3 term"
          blurb="Each card pairs something you already know from the scene with the technology that makes it work on StreetRail."
        />

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <Reveal key={card.dance} delay={i * 60} className="h-full">
              <div className="flex h-full flex-col rounded-3xl border border-border bg-card/70 p-5 shadow-sm transition hover:border-primary/30 hover:bg-card sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-glow">{card.dance}</p>
                    <p className="mt-1 text-sm font-bold text-foreground">= {card.tech}</p>
                  </div>
                  <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead
          eyebrow="Quick lookup"
          title="Glossary"
          blurb="One-liners for the words you'll see across the site."
        />

        <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card/70 sm:mt-12">
          <dl className="divide-y divide-border">
            {GLOSSARY.map((item, i) => (
              <Reveal key={item.term} delay={i * 30} as="div">
                <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6 sm:px-8 sm:py-5">
                  <dt className="min-w-[8rem] text-sm font-black text-foreground">{item.term}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">{item.def}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </Section>

      <Section tone="deep" innerClassName="py-10 sm:py-16">
        <Reveal>
          <div className="rounded-3xl border border-glow/30 bg-glow/10 p-6 text-center sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-glow">Ready to try it?</p>
            <h2 className="display mt-3 text-2xl text-foreground sm:text-4xl">Pick a mode and move.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Start in H2H for the familiar shop feel, then flip the toggle to watch agents negotiate,
              pay, and log rights on Arc.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="lift inline-flex h-11 items-center gap-2 rounded-full bg-linear-to-r from-primary to-glow px-6 text-sm font-black text-primary-foreground shadow-glow-sm"
              >
                Shop merch <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/agent-negotiation"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface/60 px-6 text-sm font-bold backdrop-blur hover:bg-secondary"
              >
                Watch agents negotiate
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>

      <SiteFooter />
    </div>
  );
}
