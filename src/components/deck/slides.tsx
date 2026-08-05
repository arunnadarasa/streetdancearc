import type { ReactNode } from "react";
import { launchMarkets, sizing } from "@/data/markets";

const GREEN = "#4f46e5";
const CHERRY = "#E63946";

function Chrome({ n, total = 13 }: { n: number; total?: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:flex sm:px-6 sm:py-3 sm:text-xs">
      <span>StreetRail · Arc Testnet</span>
      <span>
        {n} / {total}
      </span>
    </div>
  );
}

function Kicker({ children, color = GREEN }: { children: ReactNode; color?: string }) {
  return (
    <div
      className="text-[10px] font-black uppercase tracking-[0.25em] sm:text-xs"
      style={{ color }}
    >
      {children}
    </div>
  );
}

function Slide({
  n,
  children,
  bg = "bg-surface-2",
}: {
  n: number;
  children: ReactNode;
  bg?: string;
}) {
  return (
    <div className={`relative min-h-full w-full ${bg} text-foreground`}>
      <div className="flex min-h-full w-full flex-col p-5 pb-6 sm:p-10 sm:pb-14 md:p-14 md:pb-16">
        {children}
      </div>
      <Chrome n={n} />
    </div>
  );
}

// 1
function SlideTitle() {
  return (
    <Slide n={1} bg="bg-background">
      <div className="flex h-full flex-col justify-between">
        <Kicker>Encode × Arc · Stablecoin Hackathon · Aug 2026</Kicker>
        <div>
          <h2 className="text-4xl font-black leading-[0.9] tracking-tight sm:text-6xl md:text-7xl">
            Street
            <br />
            <span style={{ color: GREEN }}>Rail.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:mt-5 sm:text-lg">
            Streetwear + onchain move rights, settled in stablecoins on Circle's Arc.
          </p>

        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold sm:gap-2 sm:text-xs">
          {["H2H · H2A · A2A", "USDC gas", "EURC + cirBTC", "Privy · Google login", "Verified on Arcscan"].map(
            (t) => (
              <span
                key={t}
                className="rounded-full border border-border px-2.5 py-1 text-foreground/85 sm:px-3 sm:py-1.5"
              >
                {t}
              </span>
            ),
          )}
        </div>
      </div>
    </Slide>
  );
}

// 2
function SlideProblem() {
  return (
    <Slide n={2}>
      <Kicker color={CHERRY}>The Problem</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Choreographers built the internet's dance layer.
        <br />
        <span style={{ color: CHERRY }}>They got paid $0.</span>
      </h3>
      <div className="mt-auto grid gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-border p-3 sm:p-4">
          <div className="text-xs text-muted-foreground sm:text-sm">Missing</div>
          <div className="mt-1 text-sm font-bold sm:text-base">
            No registry of who made which move.
          </div>
        </div>
        <div
          className="rounded-xl border p-3 sm:p-4"
          style={{ borderColor: CHERRY }}
        >
          <div className="text-3xl font-black sm:text-5xl" style={{ color: CHERRY }}>
            $0
          </div>
          <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
            paid to the choreographer behind the most-copied TikTok dance of 2025.
          </div>
        </div>
        <div className="rounded-xl border border-border p-3 sm:p-4">
          <div className="text-xs text-muted-foreground sm:text-sm">Missing</div>
          <div className="mt-1 text-sm font-bold sm:text-base">
            No settlement rail once it goes viral.
          </div>
        </div>
      </div>
    </Slide>
  );
}

// 3
function SlideInsight() {
  return (
    <Slide n={3}>
      <Kicker>The Insight</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Street dance already knows how to give credit.
        <br />
        <span style={{ color: GREEN }}>We give it a settlement layer.</span>
      </h3>
      <div className="mt-auto grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-xl border border-border p-3 sm:p-5">
          <Kicker>Culture</Kicker>
          <p className="mt-2 text-lg font-black sm:text-2xl">"Credit or catch a fade."</p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Crews, battles, and callouts already enforce authorship offline. The rules
            exist — the receipts don't.
          </p>
        </div>
        <div className="rounded-xl border p-3 sm:p-5" style={{ borderColor: GREEN }}>
          <Kicker>Onchain</Kicker>
          <p className="mt-2 font-mono text-sm sm:text-base">
            log(token, amount, cid)
          </p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            One call. Immutable. Priced in USDC / EURC / cirBTC. Arcscan is the receipt.
          </p>
        </div>
      </div>
    </Slide>
  );
}

// 4
function SlideWhatWeBuilt() {
  return (
    <Slide n={4}>
      <Kicker>What We Built</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Two products. One repo. Same wallet.
      </h3>
      <div className="mt-auto grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-xl border border-border p-3 sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
            Track · Agentic Economy
          </div>
          <div className="mt-2 text-xl font-black sm:text-2xl" style={{ color: GREEN }}>
            Rights Registry
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Log any dance move onchain in one call. AI agent quotes, pays, and files the
            receipt autonomously.
          </p>
        </div>
        <div className="rounded-xl border border-border p-3 sm:p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
            Track · DeFi
          </div>
          <div className="mt-2 text-xl font-black sm:text-2xl" style={{ color: GREEN }}>
            Streetwear Shop
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Sneakers, snapbacks, jackets. Checkout in USDC, EURC, or cirBTC via Circle
            App Kits.
          </p>
        </div>
      </div>
    </Slide>
  );
}

// 5
function SlideInterfaces() {
  const modes: Array<{ tag: string; title: string; body: string; points: string[] }> = [
    {
      tag: "H2H",
      title: "Human to human",
      body: "The shop you already know.",
      points: ["Browse, cart, checkout", "Privy Google login", "USDC / EURC / cirBTC pay"],
    },
    {
      tag: "H2A",
      title: "Human to agent",
      body: "You delegate, the agent buys.",
      points: ["Spend policy caps", "Confirm above threshold", "Auditable run ledger"],
    },
    {
      tag: "A2A",
      title: "Agent to agent",
      body: "Two agents negotiate, no human.",
      points: ["A2A 0.3 message/send", "AP2 mandates + UCP checkout", "x402 settlement"],
    },
  ];
  return (
    <Slide n={5}>
      <Kicker>Interfaces</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Three interfaces, <span style={{ color: GREEN }}>one rail.</span>
      </h3>
      <div className="mt-3 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-4">
        {modes.map((m) => (
          <div key={m.tag} className="rounded-xl border border-border p-3 sm:p-5">
            <div className="text-lg font-black sm:text-2xl" style={{ color: GREEN }}>
              {m.tag}
            </div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
              {m.title}
            </div>
            <p className="mt-1.5 text-xs font-bold sm:text-sm">{m.body}</p>
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground sm:text-sm">
              {m.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span style={{ color: GREEN }}>·</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        All three are live in the app behind one toggle — H2H / H2A / A2A — and settle to the same
        contract on Arc Testnet, in stablecoins.
      </p>

    </Slide>
  );
}

// 6
function SlideLive() {
  const stats = [
    { k: "5042002", v: "Arc Testnet chain id" },
    { k: "0.8.24", v: "solc, verified on Arcscan" },
    { k: "6", v: "decimals — USDC is gas" },
  ];
  return (
    <Slide n={6}>
      <Kicker>Live on Arc</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Shipped. Deployed. <span style={{ color: GREEN }}>Verified.</span>
      </h3>
      <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.k} className="rounded-xl border border-border p-3 sm:p-5">
            <div className="text-2xl font-black sm:text-4xl" style={{ color: GREEN }}>
              {s.k}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground sm:text-sm">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-xl border border-border bg-background p-3 sm:p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
          DanceMoveTokens.sol
        </div>
        <div className="mt-1 break-all font-mono text-[11px] sm:text-sm">
          0x4d13b45f823f8944522890c20d8695b6005465f0
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground sm:text-sm">
          Verified on Arcscan · USDC · EURC · cirBTC supported
        </div>
      </div>
    </Slide>
  );
}

// 7
function SlideAgent() {
  const steps = [
    ["Intent", '"Buy a size L snapback under 25 USDC."'],
    ["Policy", "Per-item cap, daily cap, confirm threshold."],
    ["Interrupt", "Above the threshold the human approves first."],
    ["Pay", "Agent signs USDC / EURC / cirBTC from treasury."],
    ["Ledger", "Every step logged, Arcscan tx as the receipt."],
  ];
  return (
    <Slide n={7}>
      <Kicker>H2A · Human to agent</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        You set the policy. <span style={{ color: GREEN }}>The agent spends inside it.</span>
      </h3>
      <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-5">
        {steps.map(([label, body], i) => (
          <div
            key={label}
            className="rounded-xl border border-border p-2.5 sm:p-3"
          >
            <div className="text-[10px] font-bold text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="mt-1 text-sm font-black sm:text-base" style={{ color: GREEN }}>
              {label}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{body}</div>
          </div>
        ))}
      </div>
      <p className="mt-auto text-xs text-muted-foreground sm:text-sm">
        Autonomous spending in USDC · decision logic in the agent, not the UI.
      </p>
    </Slide>
  );
}

// 8
function SlideProtocolStack() {
  const layers: [string, string][] = [
    ["A2A 0.3", "Agent card discovery + message/send task loop"],
    ["AP2", "Intent, cart, and payment mandates the buyer signs"],
    ["UCP", "Discovery, checkout, order + conformance self-test"],
    ["x402", "402 challenge, payment payload, verified receipt"],
    ["Arc Testnet", "USDC settlement, real tx hash on Arcscan"],
  ];
  return (
    <Slide n={8}>
      <Kicker>A2A · Agent to agent</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        A standards stack, <span style={{ color: GREEN }}>not a custom flow.</span>
      </h3>
      <div className="mt-3 grid flex-1 content-start gap-1.5 overflow-y-auto pr-1 sm:mt-5 sm:gap-2">
        {layers.map(([k, v], i) => (
          <div
            key={k}
            className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] items-center gap-3 rounded-lg border border-border p-2 sm:p-3"
            style={i === layers.length - 1 ? { borderColor: GREEN } : undefined}
          >
            <div className="text-xs font-black sm:text-base" style={{ color: GREEN }}>
              {k}
            </div>
            <div className="text-[11px] text-muted-foreground sm:text-sm">{v}</div>
          </div>
        ))}
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        Buyer and seller agents negotiate live in GX mode, then settle on-chain.
      </p>
    </Slide>
  );
}

// 9
function SlideDefi() {
  return (
    <Slide n={9}>
      <Kicker>Track 2 · DeFi</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Programmable money <span style={{ color: GREEN }}>for the culture.</span>
      </h3>
      <div className="mt-auto grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-xl border border-border p-3 sm:p-5">
          <Kicker>Multi-stablecoin checkout</Kicker>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Shopify catalog priced in USD, settled in USDC, EURC, or cirBTC. App Kits
            Unified Balance picks the token with headroom.
          </p>
        </div>
        <div className="rounded-xl border border-border p-3 sm:p-5">
          <Kicker>Nanopayment royalties</Kicker>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            arc-nanopayments streams sub-cent USDC per play back to the choreographer's
            wallet. Continuous, not periodic.
          </p>
        </div>
      </div>
    </Slide>
  );
}

// 10
function SlideCriteria() {
  const rows: [string, string][] = [
    ["Meaningful use of Arc / USDC", "Contract deployed + verified, USDC as gas token"],
    ["Programmable money flows", "Autonomous agent settlement + nanopayment royalty streams"],
    ["Interoperable commerce", "H2H, H2A, and A2A on A2A 0.3 + AP2 + UCP + x402"],
    ["Uses App Kits", "Unified Balance + Send in the streetwear checkout"],
    ["Agent with decision logic", "Rights Agent picks token, fee, and files log() unattended"],
    ["Autonomous spending in USDC", "Treasury wallet signs via Circle SCP — no manual approval"],
    ["Uses Agent Stack", "Circle agent-stack-starter-kits scaffolds the Rights Agent"],
  ];
  return (
    <Slide n={10}>
      <Kicker>How we map to the criteria</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        Every judging bullet has a feature behind it.
      </h3>
      <div className="mt-3 flex-1 overflow-hidden sm:mt-5">
        <div className="grid h-full grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:gap-2">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 rounded-lg border border-border p-2 sm:p-3"
            >
              <div className="text-[11px] font-black text-muted-foreground sm:text-sm">
                {k}
              </div>
              <div className="text-[11px] text-muted-foreground sm:text-sm" style={{ color: GREEN }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  );
}

// 11
function SlideRoadmap() {
  const shipped = [
    "Contract verified on Arcscan",
    "Privy Google login + embedded wallet",
    "7 SKUs live in Shopify (dev store)",
    "USDC / EURC / cirBTC token switcher",
    "Mobile-tuned end to end",
  ];
  const next = [
    "Rights Agent GA — Gemini + Agent Stack",
    "Nanopayment royalty streams (per-play)",
    "ERC-721 receipt NFT per logged move",
    "Crew treasuries + on-chain cosigns",
    "Demo Day rehearsal + judge Q&A pack",
  ];
  return (
    <Slide n={11}>
      <Kicker>Traction & Roadmap</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        Working today. Shipping through <span style={{ color: GREEN }}>Demo Day.</span>
      </h3>
      <div className="mt-3 grid flex-1 gap-3 overflow-hidden sm:mt-5 sm:grid-cols-2 sm:gap-4">
        <div className="flex min-h-0 flex-col rounded-xl border border-border p-3 sm:p-4">
          <Kicker>Shipped</Kicker>
          <ul className="mt-2 space-y-1 overflow-y-auto pr-1 text-[11px] text-foreground/85 sm:text-sm">
            {shipped.map((s) => (
              <li key={s} className="flex gap-2">
                <span style={{ color: GREEN }}>✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-h-0 flex-col rounded-xl border border-border p-3 sm:p-4">
          <Kicker>Next · Aug 9 · Aug 20</Kicker>
          <ul className="mt-2 space-y-1 overflow-y-auto pr-1 text-[11px] text-foreground/85 sm:text-sm">
            {next.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-muted-foreground">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Slide>
  );
}

// 12
function SlideMarkets() {
  return (
    <Slide n={12}>
      <Kicker>Market opportunity</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-[0.95] tracking-tight sm:text-4xl md:text-5xl">
        Street dance travels
        <br />
        through the currencies
        <br />
        <span style={{ color: GREEN }}>that don't hold.</span>
      </h3>

      <div className="mt-3 grid gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-4">
        {sizing.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border p-2.5 sm:p-4"
          >
            <div className="text-lg font-black tracking-tight sm:text-3xl">{s.value}</div>
            <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground sm:mt-1 sm:text-xs">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
        {launchMarkets.map((m) => (
          <span
            key={m.country}
            className="whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-[10px] font-bold text-foreground/85 sm:px-3.5 sm:py-1.5 sm:text-sm"
          >
            {m.country}{" "}
            <span className="text-muted-foreground">{m.inflation}</span>
          </span>
        ))}
      </div>

      <p className="mt-3 max-w-3xl text-[10px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-sm">
        In these markets a card checkout costs 10–15% in FX and demands a card most
        young buyers don't hold. USDC on Arc settles in seconds, for sub-cent gas,
        with the creator's royalty split at the moment of sale.
      </p>
    </Slide>
  );
}

// 13
function SlideClose() {
  return (
    <Slide n={13} bg="bg-background">
      <div className="flex h-full flex-col justify-between">
        <Kicker>Built for Encode × Arc</Kicker>
        <h2 className="text-4xl font-black leading-[0.9] tracking-tight sm:text-6xl md:text-7xl">
          Give the culture
          <br />
          <span style={{ color: GREEN }}>its receipts.</span>
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          streetdancearc.lovable.app · DanceMoveTokens.sol on Arc Testnet
        </p>
      </div>
    </Slide>
  );
}

export const slides: Array<{ id: string; render: () => ReactNode }> = [
  { id: "title", render: () => <SlideTitle /> },
  { id: "problem", render: () => <SlideProblem /> },
  { id: "insight", render: () => <SlideInsight /> },
  { id: "built", render: () => <SlideWhatWeBuilt /> },
  { id: "interfaces", render: () => <SlideInterfaces /> },
  { id: "live", render: () => <SlideLive /> },
  { id: "agent", render: () => <SlideAgent /> },
  { id: "protocols", render: () => <SlideProtocolStack /> },
  { id: "defi", render: () => <SlideDefi /> },
  { id: "criteria", render: () => <SlideCriteria /> },
  { id: "roadmap", render: () => <SlideRoadmap /> },
  { id: "markets", render: () => <SlideMarkets /> },
  { id: "close", render: () => <SlideClose /> },
];
