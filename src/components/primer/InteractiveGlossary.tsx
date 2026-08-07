import { useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";

export interface GlossaryEntry {
  term: string;
  tag: string;
  analogy: string;
  def: string;
  related?: string[];
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Agentic",
    tag: "Agents",
    analogy: "A crew member you trust to run the set while you catch your breath.",
    def: "Software that acts on your behalf inside rules you set — it shops, negotiates and pays without asking you at every step.",
    related: ["Mandate", "H2A", "A2A"],
  },
  {
    term: "Arc",
    tag: "Chain",
    analogy: "The cypher floor: everyone sees the move, in order, and nobody can erase it.",
    def: "Circle's blockchain testnet where StreetRail settles every payment and rights record. Chain ID 5042002.",
    related: ["Gas", "Receipt", "USDC"],
  },
  {
    term: "AP2",
    tag: "Agents",
    analogy: "The setlist you agree on before the battle starts.",
    def: "Agent Payment Protocol — a signed permission slip that says what an agent may spend, on what, and until when.",
    related: ["Mandate", "Agentic"],
  },
  {
    term: "Blockchain",
    tag: "Chain",
    analogy: "The cypher's memory — every round remembered, in order, by everyone.",
    def: "A shared ledger that nobody can rewrite on their own, so receipts stay trustworthy.",
    related: ["Arc", "Receipt"],
  },
  {
    term: "cirBTC",
    tag: "Money",
    analogy: "Paying the door in gold instead of cash.",
    def: "A Circle-issued bitcoin token you can pick as a payment option on StreetRail.",
    related: ["Stablecoin", "USDC", "EURC"],
  },
  {
    term: "ERC-1271",
    tag: "Chain",
    analogy: "The venue stamp instead of a personal autograph — the house vouches for you.",
    def: "A way for a smart contract wallet (like StreetRail's treasury) to approve an action, so no individual keyholder has to sign.",
    related: ["Mandate", "Treasury"],
  },
  {
    term: "EURC",
    tag: "Money",
    analogy: "Euro cash at a European jam.",
    def: "A euro-backed stablecoin accepted at checkout across all four modes.",
    related: ["Stablecoin", "USDC"],
  },
  {
    term: "Gas",
    tag: "Chain",
    analogy: "The door fee for stepping on the floor.",
    def: "The network fee for a transaction. On Arc it's paid in USDC, so you never need a second token.",
    related: ["Arc", "USDC"],
  },
  {
    term: "GX",
    tag: "Modes",
    analogy: "Calling a routine instead of teaching every count.",
    def: "Generative Experience — an interface where you state intent and an agent builds the flow, instead of you clicking every screen.",
    related: ["H2A", "A2A", "Agentic"],
  },
  {
    term: "H2H",
    tag: "Modes",
    analogy: "You in the shop, picking your own fit.",
    def: "Human-to-human: the familiar storefront — browse, add to cart, pay in stablecoins.",
    related: ["GX", "H2A"],
  },
  {
    term: "H2A",
    tag: "Modes",
    analogy: "Telling your crew member your size and budget, then letting them hunt.",
    def: "Human-to-agent: you set the intent and limits, the agent finds and settles the purchase.",
    related: ["Mandate", "GX"],
  },
  {
    term: "A2A",
    tag: "Modes",
    analogy: "Two managers settling the booking fee while the dancers warm up.",
    def: "Agent-to-agent: two agents negotiate price and terms, then pay each other over x402 with no human in the loop.",
    related: ["x402", "Nanopayment"],
  },
  {
    term: "A2H",
    tag: "Modes",
    analogy: "The promoter walking over with your cut of the door.",
    def: "Agent-to-human: a rights agent spots your move being used and pushes a payout to your inbox for approval.",
    related: ["Move Registry", "Mandate"],
  },
  {
    term: "Mandate",
    tag: "Agents",
    analogy: "The setlist with a hard stop time — off-list moves need a nod first.",
    def: "A time-boxed, signed spending rule an agent must obey. Expire it, renew it, or revoke it at any point.",
    related: ["AP2", "ERC-1271", "Agentic"],
  },
  {
    term: "Move Registry",
    tag: "Rights",
    analogy: "The rights wall where your signature move is chalked up with your name.",
    def: "The on-chain contract where choreography fingerprints (CIDs) are logged so credit travels with the move.",
    related: ["CID", "Receipt", "A2H"],
  },
  {
    term: "CID",
    tag: "Rights",
    analogy: "The fingerprint of one exact take — change a single frame, you get a new print.",
    def: "Content Identifier: a hash of your rights metadata. Same data, same CID — which is how proof of authorship holds up.",
    related: ["Move Registry"],
  },
  {
    term: "Nanopayment",
    tag: "Money",
    analogy: "A tip jar that only gets counted once it's worth the walk to the bank.",
    def: "Tiny per-action charges kept in an off-chain tally and batched to Arc once they cross a threshold.",
    related: ["x402", "A2A"],
  },
  {
    term: "Privy",
    tag: "Wallet",
    analogy: "Your dance card at the door — flash it, you're in.",
    def: "The login and wallet layer. Sign in with Google and get an embedded wallet, no seed phrase to lose.",
    related: ["Wallet"],
  },
  {
    term: "Receipt",
    tag: "Chain",
    analogy: "The clip of the round — proof it happened, timestamped.",
    def: "On-chain proof a payment or registry log went through, viewable on ArcScan.",
    related: ["Arc", "Move Registry"],
  },
  {
    term: "Stablecoin",
    tag: "Money",
    analogy: "Prize money that's still the same amount when you get home.",
    def: "A token pegged to a real currency, so value doesn't swing between the battle and the bank.",
    related: ["USDC", "EURC", "cirBTC"],
  },
  {
    term: "Treasury",
    tag: "Wallet",
    analogy: "The crew's shared pot for gas, travel and payouts.",
    def: "StreetRail's programmable wallet that funds agent payouts and pays gas on Arc.",
    related: ["ERC-1271", "A2H"],
  },
  {
    term: "USDC",
    tag: "Money",
    analogy: "The house currency — accepted everywhere in the building.",
    def: "A dollar-backed stablecoin and Arc's native gas token, so one coin covers goods and fees.",
    related: ["Gas", "Stablecoin"],
  },
  {
    term: "Wallet",
    tag: "Wallet",
    analogy: "Your name on the flyer plus the pocket you keep the fee in.",
    def: "The account that holds your stablecoins and signs your actions on Arc.",
    related: ["Privy", "Treasury"],
  },
  {
    term: "x402",
    tag: "Agents",
    analogy: "The bouncer checking your wristband before you step through.",
    def: "A protocol that turns 'Payment Required' into a machine-payable checkout: show the on-chain receipt, get the goods.",
    related: ["A2A", "Nanopayment"],
  },
];

const TAGS = ["All", "Modes", "Agents", "Money", "Chain", "Rights", "Wallet"] as const;

export function InteractiveGlossary() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<(typeof TAGS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((e) => {
      const matchesTag = tag === "All" || e.tag === tag;
      const matchesQuery =
        !q ||
        e.term.toLowerCase().includes(q) ||
        e.def.toLowerCase().includes(q) ||
        e.analogy.toLowerCase().includes(q);
      return matchesTag && matchesQuery;
    });
  }, [query, tag]);

  const active = GLOSSARY.find((e) => e.term === open) ?? null;

  function pick(term: string) {
    setOpen(term);
    setTag("All");
    setQuery("");
  }

  return (
    <div className="mt-8 space-y-4 sm:mt-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a term — x402, mandate, gas…"
            aria-label="Search glossary"
            className="h-11 w-full rounded-full border border-border bg-card/70 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition ${
                tag === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtered.map((entry) => {
          const isOpen = entry.term === open;
          return (
            <button
              key={entry.term}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : entry.term)}
              className={`h-10 rounded-full border px-4 text-sm font-bold transition ${
                isOpen
                  ? "border-glow bg-glow/15 text-foreground shadow-glow-sm"
                  : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {entry.term}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No match for “{query}”. Try “agentic”, “x402” or “mandate”.
          </p>
        )}
      </div>

      {active && (
        <div className="rounded-3xl border border-glow/30 bg-card/80 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-glow">{active.tag}</p>
              <h3 className="display mt-1 text-2xl text-foreground sm:text-3xl">{active.term}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close definition"
              className="rounded-full border border-border p-2 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-4 flex gap-3 rounded-2xl border border-border/60 bg-surface p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-glow" aria-hidden />
            <p className="text-sm font-semibold leading-relaxed text-foreground">{active.analogy}</p>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{active.def}</p>

          {active.related && active.related.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Related</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {active.related.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => pick(r)}
                    className="h-8 rounded-full border border-border bg-surface px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {r} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
