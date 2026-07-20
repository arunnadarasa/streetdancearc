import { createFileRoute } from "@tanstack/react-router";
import { PrivyRoot } from "@/components/PrivyRoot";
import { Header } from "@/components/dance/Header";
import { TreasuryCard } from "@/components/dance/TreasuryCard";
import { MintForm } from "@/components/dance/MintForm";

export const Route = createFileRoute("/")({
  loader: () => ({
    privyAppId: process.env.PRIVY_APP_ID,
    treasuryAddress: process.env.CIRCLE_TREASURY_ADDRESS,
  }),
  component: Index,
});

function Index() {
  const { privyAppId, treasuryAddress } = Route.useLoaderData();
  return (
    <PrivyRoot appId={privyAppId}>
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="mx-auto max-w-2xl px-5 py-10 space-y-8">
          <Header />

          <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-[#1DB954]/20 via-neutral-900 to-black p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DB954]">
              Dance & Choreography
            </p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-white">
              License your moves.<br />Pin your rights.
            </h2>
            <p className="mt-3 max-w-md text-sm text-neutral-400">
              Create, pin, and trade unique dance moves with JSON metadata on IPFS
              representing rights — paid in USDC, EURC, or cirBTC on Circle's Arc Testnet.
            </p>
          </section>

          <TreasuryCard address={treasuryAddress} />
          <MintForm />

          <footer className="pt-6 text-center text-xs text-neutral-500">
            Built during the Creative AI &amp; Quantum Hackathon organised by StreetKode Fam
            during Indian Krump Festival 14
          </footer>
        </div>
      </main>
    </PrivyRoot>
  );
}
