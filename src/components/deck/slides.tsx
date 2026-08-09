import type { ReactNode } from "react";
import { launchMarkets, sizing } from "@/data/markets";

const GREEN = "#4f46e5";
const CHERRY = "#E63946";

function Chrome({ n, total = 19 }: { n: number; total?: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:flex sm:px-6 sm:py-3 sm:text-xs">
      <span>StreetRail · Midnight Undeployed</span>
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
        <Kicker>
          Midnight Local Undeployed · Compact · experimental mUSDC
        </Kicker>
        <div>
          <h2 className="text-4xl font-black leading-[0.9] tracking-tight sm:text-6xl md:text-7xl">
            Street
            <br />
            <span style={{ color: GREEN }}>Rail.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:mt-5 sm:text-lg">
            Streetwear checkout and dance-move rights, settled with experimental mUSDC on Midnight
            Local Undeployed — Compact circuits keep witnesses private, genesis server-append lands
            real ledger txs, and the local indexer is the receipt.
          </p>

        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold sm:gap-2 sm:text-xs">
          {["H2H · H2A · A2A · A2H", "mUSDC settle", "x402 · AP2 · UCP", "Lace / server-append", "Indexer receipt"].map(
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
            One Compact call. Immutable. Priced in experimental mUSDC. The indexer is the receipt.
          </p>
        </div>
      </div>
    </Slide>
  );
}

// 4
function SlideWhyMidnight() {
  const rows: Array<{ rail: string; gas: string; verdict: string; color: string }> = [
    { rail: "Public L1", gas: "Full disclosure", verdict: "Every CID, buyer, and mandate is public forever.", color: CHERRY },
    { rail: "Typical L2 + escrow", gas: "Cheaper, transparent", verdict: "Agents still leak spend policy and identity on-chain.", color: "#f59e0b" },
    { rail: "Midnight Undeployed", gas: "tDUST · ZK circuits", verdict: "Witnesses stay private; only disclose() lands on the ledger.", color: GREEN },
  ];
  return (
    <Slide n={4}>
      <Kicker>Why Midnight</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Agentic commerce needs
        <br />
        <span style={{ color: GREEN }}>privacy by default.</span>
      </h3>
      <p className="mt-3 max-w-3xl text-xs text-muted-foreground sm:text-sm">
        StreetRail anchors move CIDs, AP2 mandates, UCP orders, and experimental mUSDC transfers on
        Midnight Local Undeployed. Circuit inputs stay private unless Compact calls disclose() —
        and Undeployed writes use the genesis wallet so demos don&apos;t depend on Lace signing.
      </p>
      <div className="mt-auto divide-y divide-border rounded-xl border border-border">
        {rows.map((r) => (
          <div key={r.rail} className="grid gap-1 p-3 sm:grid-cols-[10rem_13rem_1fr] sm:items-center sm:gap-4 sm:p-4">
            <p className="text-xs font-black sm:text-sm">{r.rail}</p>
            <p className="text-xs font-bold sm:text-sm" style={{ color: r.color }}>{r.gas}</p>
            <p className="text-[11px] text-muted-foreground sm:text-sm">{r.verdict}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground sm:text-xs">
        Local stack: midnight-node 0.22.5 · indexer-standalone 4.0.2 · proof-server 8.0.3. Verify
        anchors with GraphQL against the indexer — not a simulated tx hash.
      </p>
    </Slide>
  );
}

// 5
function SlideWhatWeBuilt() {
  return (
    <Slide n={5}>
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
            Sneakers, snapbacks, jackets. Checkout settles experimental mUSDC via the
            x402 facilitator on Undeployed.
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
      points: ["Browse, cart, checkout", "Connect Lace / server-append", "mUSDC x402 settle"],
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
    {
      tag: "A2H",
      title: "Agent to human",
      body: "The agent starts. You get paid.",
      points: ["Royalties pushed, not claimed", "Asks when over mandate", "Receipt in the inbox"],
    },
  ];
  return (
    <Slide n={6}>
      <Kicker>Interfaces</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Four interfaces, <span style={{ color: GREEN }}>one rail.</span>
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-4 sm:gap-3">
        {modes.map((m) => (
          <div key={m.tag} className="rounded-xl border border-border p-3 sm:p-4">
            <div className="text-lg font-black sm:text-2xl" style={{ color: GREEN }}>
              {m.tag}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
              {m.title}
            </div>
            <p className="mt-1.5 text-[11px] font-bold sm:text-sm">{m.body}</p>
            <ul className="mt-2 space-y-1 text-[10px] text-muted-foreground sm:text-xs">
              {m.points.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <span style={{ color: GREEN }}>·</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        All four are live in the app behind one toggle — H2H / H2A / A2A / A2H — and settle to the
        same Compact MoveRegistry on Midnight Undeployed, in experimental mUSDC.
      </p>

    </Slide>
  );
}

// 6
function SlideA2h() {
  const quadrants: Array<{ tag: string; who: string; body: string; dim?: boolean }> = [
    { tag: "H2H", who: "Human → Human", body: "Shop, cart, checkout. The interface everyone has already built." },
    { tag: "H2A", who: "Human → Agent", body: "Delegate a purchase under a spend mandate. The agent buys." },
    { tag: "A2A", who: "Agent → Agent", body: "Buyer and seller agents negotiate and settle over x402." },
    { tag: "A2H", who: "Agent → Human", body: "The agent initiates. Royalties are pushed, approvals requested." },
  ];
  return (
    <Slide n={7}>
      <Kicker>A2H · The missing direction</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        Nobody builds agent-to-human,{" "}
        <span style={{ color: GREEN }}>because there was no rail to push value over.</span>
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
        {quadrants.map((q) => {
          const live = q.tag === "A2H";
          return (
            <div
              key={q.tag}
              className="rounded-xl border p-3 sm:p-4"
              style={{ borderColor: live ? GREEN : undefined }}
            >
              <div
                className="text-base font-black sm:text-xl"
                style={{ color: live ? CHERRY : GREEN }}
              >
                {q.tag}
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
                {q.who}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground sm:text-sm">{q.body}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        In StreetRail the Rights Agent can pay when a move earns, pause when the payout breaks the
        AP2 mandate, and drop an indexer-linked receipt in a payout inbox. Merch offers can still
        be claimed with a signed mandate; settlement on Undeployed uses genesis server-append so the
        demo doesn&apos;t depend on browser wallet signing for every write.
      </p>
    </Slide>
  );
}


// 6
function SlideLive() {
  const stats = [
    { k: "undeployed", v: "Midnight network id" },
    { k: "0.23", v: "Compact language pragma" },
    { k: "4", v: "Compact contracts deployed" },
  ];
  return (
    <Slide n={8}>
      <Kicker>Live on Midnight Undeployed</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Compiled. Deployed. <span style={{ color: GREEN }}>Indexed.</span>
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
      <div className="mt-auto grid gap-2 sm:grid-cols-2 sm:gap-4">
        {[
          {
            name: "MoveRegistry.compact",
            addr: "67656a55…64787",
            note: "appendEntry · CID + author commitment",
          },
          {
            name: "MandateVault.compact",
            addr: "8e98a46e…64ab6",
            note: "AP2 CartMandate anchors · ap2:buyer:v1",
          },
          {
            name: "OrderLedger.compact",
            addr: "0cbe58c9…bf786",
            note: "UCP order recorder · merchant key fpr",
          },
          {
            name: "MidnightUSDC.compact",
            addr: "7e520256…8c472",
            note: "Experimental mUSDC · faucet + transfer + spent nonces",
          },
        ].map((c) => (
          <div key={c.name} className="rounded-xl border border-border bg-background p-3 sm:p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
              {c.name}
            </div>
            <div className="mt-1 break-all font-mono text-[11px] sm:text-sm">{c.addr}</div>
            <div className="mt-1 text-[11px] text-muted-foreground sm:text-sm">{c.note}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground sm:text-sm">
        Addresses refresh after each Undeployed redeploy. Verify with GraphQL against
        localhost:8088 — real ContractCall rows, not simulated hashes.
      </p>
    </Slide>
  );
}

// 7
function SlideAgent() {
  const steps = [
    ["Intent", '"Buy a size L snapback under 25 USDC."'],
    ["Policy", "Per-item cap, daily cap, confirm threshold."],
    ["Interrupt", "Above the threshold the human approves first."],
    ["Pay", "x402 facilitator settles experimental mUSDC (server-append)."],
    ["Ledger", "Every step logged; indexer tx hash is the receipt."],
  ];
  return (
    <Slide n={9}>
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
        Autonomous spending in experimental mUSDC · decision logic in the agent, not the UI.
      </p>
    </Slide>
  );
}

// 8
function SlideProtocolStack() {
  const layers: [string, string][] = [
    ["A2A 0.3", "Agent card discovery + message/send — inbound for A2A, outbound for A2H"],
    ["AP2", "Intent, cart, and payment mandates the buyer signs"],
    ["UCP", "Discovery, checkout, order + conformance self-test"],
    ["x402", "402 challenge, payment payload, verified receipt"],
    ["Midnight Undeployed", "mUSDC settlement, real tx hash on the local indexer"],
  ];
  return (
    <Slide n={10}>
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
        Buyer and seller agents negotiate live in GX mode, then settle on Midnight. In A2H the same
        stack runs outbound: the AP2 mandate is the standing authorization, x402 settles, and the
        indexer hash is the receipt — MandateVault can still anchor digests for counterparties.
      </p>
    </Slide>
  );
}

// 9b — Midnight Undeployed stack
function SlideMidnightStack() {
  const rows: [string, string][] = [
    ["Compact contracts", "MoveRegistry · MandateVault · OrderLedger · MidnightUSDC (pragma 0.23)"],
    ["midnight-js 4.1.1", "CompiledContract + WalletFacade / wallet-sdk 1.2.0 against indexer 4.0.2"],
    ["Genesis server-append", "Undeployed writes use seed …0002 — Lace is optional for connect UX"],
    ["x402 facilitator", "challenge → verify → settle routes for midnight-mUSDC"],
    ["Proof server", "Local proof-server:8.0.3 — cold proofs can take up to ~4 min"],
    ["Indexer GraphQL", "localhost:8088/api/v4/graphql — source of truth for receipts"],
    ["AIsa negotiation", "Buyer/seller agents negotiate natural language, then settle mUSDC"],
  ];
  return (
    <Slide n={11}>
      <Kicker>Built on Midnight Undeployed</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        One local stack, <span style={{ color: GREEN }}>real ledger writes.</span>
      </h3>
      <div className="mt-3 grid flex-1 content-start gap-1.5 overflow-y-auto pr-1 sm:mt-5 sm:gap-2">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.5fr)] items-center gap-3 rounded-lg border border-border p-2 sm:p-3"
          >
            <div className="text-xs font-black sm:text-base" style={{ color: GREEN }}>
              {k}
            </div>
            <div className="text-[11px] text-muted-foreground sm:text-sm">{v}</div>
          </div>
        ))}
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        After midnight-standalone down/up, redeploy Compact contracts and restart Vite — chain state
        and LevelDB private state must stay aligned or you get RpcError 117.
      </p>
    </Slide>
  );
}

// 9c — Compact mandate authorization
function SlideOnChainAuth() {
  const modes: [string, string][] = [
    [
      "Cart mandate",
      "Buyer agent anchors an AP2 CartMandate digest in MandateVault. Counterparties verify the digest without reading private witnesses.",
    ],
    [
      "Spend policy",
      "Per-item and daily caps live in the signed mandate. Over-threshold spends interrupt for human confirm before x402 settle.",
    ],
  ];
  return (
    <Slide n={12}>
      <Kicker>On-chain authorization</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        Mandates anchor on Midnight — <span style={{ color: GREEN }}>witnesses stay private.</span>
      </h3>
      <div className="mt-3 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-4">
        {modes.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border p-3 sm:p-5">
            <div className="text-sm font-black sm:text-lg" style={{ color: GREEN }}>
              {k}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground sm:text-sm">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
            Contract
          </div>
          <div className="mt-1 font-mono text-sm font-black sm:text-lg" style={{ color: GREEN }}>
            MandateVault
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
            Scheme
          </div>
          <div className="mt-1 font-mono text-sm font-black sm:text-lg" style={{ color: GREEN }}>
            ap2:buyer:v1
          </div>
        </div>
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        Digests can be checked via /api/public/ap2-anchor. Compact disclose() is the public surface —
        private state never leaves the wallet / proof server.
      </p>
    </Slide>
  );
}

// 9d — On-chain claim offers
function SlideClaimOffers() {
  const steps: [string, string][] = [
    ["Offer", "Drop Agent pushes a limited-time merch discount to the inbox."],
    ["Claim", "User taps Claim — no wallet prompt, no user gas."],
    ["Log", "Offer claim can be anchored via Compact MoveRegistry / OrderLedger."],
    ["Receipt", "Claim code + indexer tx + signed AP2 OfferClaim mandate."],
    ["Checkout", "Discount applies when the user settles experimental mUSDC."],
  ];
  return (
    <Slide n={13}>
      <Kicker>A2H · On-chain claim offers</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        Agent-to-human offers, <span style={{ color: GREEN }}>anchored on Midnight.</span>
      </h3>
      <div className="mt-3 grid flex-1 content-start gap-1.5 overflow-y-auto pr-1 sm:mt-5 sm:gap-2">
        {steps.map(([k, v], i) => (
          <div
            key={k}
            className="grid grid-cols-[minmax(0,0.35fr)_minmax(0,1.65fr)] items-center gap-3 rounded-lg border border-border p-2 sm:p-3"
          >
            <div className="text-xs font-black sm:text-base" style={{ color: GREEN }}>
              {String(i + 1).padStart(2, "0")} {k}
            </div>
            <div className="text-[11px] text-muted-foreground sm:text-sm">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
            Registry
          </div>
          <div className="mt-1 break-all font-mono text-[11px] sm:text-sm">MoveRegistry · Compact</div>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
            Mandate vault
          </div>
          <div className="mt-1 break-all font-mono text-[11px] sm:text-sm">MandateVault · Compact</div>
        </div>
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        Claims are audited via the local Midnight indexer GraphQL.
      </p>
    </Slide>
  );
}

// 13
function SlideMarketplace() {
  const rows: [string, string][] = [
    ["Register", "Dancer appends a move CID to MoveRegistry (Compact)."],
    ["Prove", "First cold proof can take ~4 min on the local proof server."],
    ["Browse", "Shop + moves surfaces share the same Midnight Undeployed stack."],
    ["Settle", "Buyers pay experimental mUSDC through the x402 facilitator."],
    ["Verify", "Indexer GraphQL confirms ContractCall / transfer hashes."],
  ];
  return (
    <Slide n={14}>
      <Kicker>Move rights on Midnight</Kicker>
      <h3 className="mt-2 text-xl font-black leading-tight sm:text-3xl md:text-4xl">
        Choreography that <span style={{ color: GREEN }}>proves itself.</span>
      </h3>
      <div className="mt-3 grid flex-1 content-start gap-1.5 overflow-y-auto pr-1 sm:mt-5 sm:gap-2">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className="grid grid-cols-[minmax(0,0.35fr)_minmax(0,1.65fr)] items-center gap-3 rounded-lg border border-border p-2 sm:p-3"
          >
            <div className="text-xs font-black sm:text-base" style={{ color: GREEN }}>
              {String(i + 1).padStart(2, "0")} {k}
            </div>
            <div className="text-[11px] text-muted-foreground sm:text-sm">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-border bg-background p-3 sm:p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
          MoveRegistry.compact · Undeployed
        </div>
        <div className="mt-1 break-all font-mono text-[11px] sm:text-sm">67656a55…64787</div>
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground sm:text-sm">
        Live at /moves — appendEntry discloses the CID while author commitment stays ZK-bound.
        Compact MoveRegistry is the demo path for rights on Undeployed.
      </p>
    </Slide>
  );
}

// 14
function SlideDefi() {
  return (
    <Slide n={15}>
      <Kicker>Track 2 · DeFi</Kicker>
      <h3 className="mt-2 text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
        Programmable money <span style={{ color: GREEN }}>for the culture.</span>
      </h3>
      <div className="mt-auto grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-xl border border-border p-3 sm:p-5">
          <Kicker>mUSDC checkout</Kicker>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Shopify catalog priced in fiat, settled as experimental mUSDC on Midnight
            Undeployed via the x402 facilitator (demo scale ×0.001).
          </p>
        </div>
        <div className="rounded-xl border border-border p-3 sm:p-5">
          <Kicker>Private-by-default rights</Kicker>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            MoveRegistry + MandateVault keep witnesses private unless Compact disclose()
            publishes what counterparties need to verify.
          </p>
        </div>
      </div>
    </Slide>
  );
}

// 10
function SlideCriteria() {
  const rows: [string, string][] = [
    ["Meaningful use of Midnight", "Four Compact contracts deployed on Local Undeployed"],
    ["Programmable money flows", "x402 mUSDC facilitator + genesis server-append settles"],
    ["Interoperable commerce", "H2H, H2A, A2A and A2H on A2A 0.3 + AP2 + UCP + x402"],
    ["Private-by-default", "Compact witnesses private unless disclose()"],
    ["Agent with decision logic", "AIsa negotiation + AP2 spend policy + live FX pricing"],
    ["Autonomous Undeployed writes", "Genesis …0002 wallet — no Lace required for demo settles"],
    ["Standards stack", "Buyer/seller agents + purchase 402 + MandateVault / OrderLedger"],
    ["Verifiable receipts", "Indexer GraphQL confirms real ledger hashes"],
  ];
  return (
    <Slide n={16}>
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
    "MoveRegistry / MandateVault / OrderLedger / MidnightUSDC on Undeployed",
    "Lace connect + Undeployed server-append pseudo-session",
    "7 SKUs live in Shopify (dev store)",
    "mUSDC x402 challenge → verify → settle facilitator",
    "AIsa-powered A2A negotiation settle path",
    "Cart settle elapsed timer for cold proofs",
    "Mobile-tuned end to end",
    "Indexer-backed settlement history (Confirmed)",
    "Local Docker node + indexer + proof server",
    "Move append via Compact appendEntry",
    "Judges deck + primer aligned to Midnight",
  ];
  const next = [
    "Encode Club Demo Day — 9 Aug 2026",
    "Rights Agent GA — Gemini + Agent Stack",
    "Nanopayment royalty streams (per-play)",
    "Crew treasuries + on-chain cosigns",
  ];
  return (
    <Slide n={17}>
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
    <Slide n={18}>
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
        young buyers don't hold. Experimental mUSDC on Midnight Undeployed settles with a
        real Compact proof, and creator rights can be anchored without publishing every witness.
      </p>
    </Slide>
  );
}

// 13
function SlideClose() {
  return (
    <Slide n={19} bg="bg-background">
      <div className="flex h-full flex-col justify-between">
        <Kicker>Built on Midnight Local Undeployed</Kicker>
        <h2 className="text-4xl font-black leading-[0.9] tracking-tight sm:text-6xl md:text-7xl">
          Give the culture
          <br />
          <span style={{ color: GREEN }}>its receipts.</span>
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          localhost:8080 · Compact MoveRegistry + mUSDC on Undeployed
          <br />
          github.com/arunnadarasa/zealymidnight
        </p>
      </div>
    </Slide>
  );
}

export const slides: Array<{ id: string; render: () => ReactNode }> = [
  { id: "title", render: () => <SlideTitle /> },
  { id: "problem", render: () => <SlideProblem /> },
  { id: "insight", render: () => <SlideInsight /> },
  { id: "why-midnight", render: () => <SlideWhyMidnight /> },
  { id: "built", render: () => <SlideWhatWeBuilt /> },
  { id: "interfaces", render: () => <SlideInterfaces /> },
  { id: "a2h", render: () => <SlideA2h /> },
  { id: "live", render: () => <SlideLive /> },
  { id: "agent", render: () => <SlideAgent /> },
  { id: "protocols", render: () => <SlideProtocolStack /> },
  { id: "midnight-stack", render: () => <SlideMidnightStack /> },
  { id: "onchain-auth", render: () => <SlideOnChainAuth /> },
  { id: "claim-offers", render: () => <SlideClaimOffers /> },
  { id: "marketplace", render: () => <SlideMarketplace /> },
  { id: "defi", render: () => <SlideDefi /> },
  { id: "criteria", render: () => <SlideCriteria /> },
  { id: "roadmap", render: () => <SlideRoadmap /> },
  { id: "markets", render: () => <SlideMarkets /> },
  { id: "close", render: () => <SlideClose /> },
];
