import { useEffect, useState } from "react";
import { JsonBlock } from "./JsonBlock";
import { AgentRunPanel } from "./AgentRunPanel";
import { DEMO_SCALE, RIGHTS_REGISTRY } from "@/lib/agent-card";

const ENDPOINTS = [
  { method: "GET", path: "/api/public/agent-card", note: "Discovery — skills + payment extension" },
  { method: "GET", path: "/api/public/catalog", note: "Every SKU as a typed offer object" },
  { method: "POST", path: "/api/public/purchase", note: "402 challenge → settle → verified receipt" },
];

export function GxHome() {
  const [card, setCard] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/agent-card")
      .then((r) => r.json())
      .then(setCard)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1DB954]/30 bg-gradient-to-br from-[#1DB954]/15 via-neutral-900 to-black p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DB954]">
          Generative Experience · agent-to-agent
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">
          No pages.<br />Just offers, mandates and receipts.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-neutral-400">
          H2H mode renders pixels for a person. GX mode renders the same commerce as machine
          surface: a discoverable agent card, typed offers, an x402 payment challenge, and an AP2
          spend mandate the agent cannot exceed. Settlement is real USDC on Circle's Arc Testnet —
          testnet amounts are scaled to {DEMO_SCALE} × the listed price.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1DB954]">
            Machine surface
          </p>
          <h3 className="mt-1 text-lg font-black text-white">Three endpoints, zero UI</h3>
        </div>
        <ul className="space-y-2">
          {ENDPOINTS.map((e) => (
            <li
              key={e.path}
              className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <a
                href={e.path}
                target="_blank"
                rel="noreferrer"
                className="break-all font-mono text-xs font-bold text-[#1DB954] hover:underline"
              >
                <span className="mr-2 text-neutral-500">{e.method}</span>
                {e.path}
              </a>
              <span className="text-xs text-neutral-500">{e.note}</span>
            </li>
          ))}
        </ul>
      </section>

      {err && (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 text-xs text-red-300">
          Could not load the agent card: {err}
        </p>
      )}

      {card && (
        <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1DB954]">
              A2A agent card
            </p>
            <h3 className="mt-1 text-lg font-black text-white">{card.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">{card.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <JsonBlock label="skills" value={card.skills.map((s: any) => ({ id: s.id, endpoint: s.endpoint }))} />
            <JsonBlock label="payments extension" value={card.extensions.payments} tone="green" />
          </div>
          <a
            href={`https://testnet.arcscan.app/address/${RIGHTS_REGISTRY}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block break-all text-xs font-bold text-[#1DB954] hover:underline"
          >
            Rights registry {RIGHTS_REGISTRY} on Arcscan →
          </a>
        </section>
      )}

      <AgentRunPanel
        order={null}
        cta="Pick an offer in the GX shop to run a task"
      />
    </div>
  );
}
