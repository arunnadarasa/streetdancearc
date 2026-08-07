import { TreasuryCard } from "@/components/dance/TreasuryCard";
import { MintForm } from "@/components/dance/MintForm";
import { ReceiptHistoryPanel } from "@/components/dance/ReceiptHistoryPanel";
import { SectionHead } from "@/components/layout/Section";
import { Reveal } from "@/components/layout/Reveal";

export function MoveRegistry({
  treasuryAddress,
  eyebrow = "Marketplace for moves",
  title = "License a move",
  blurb = "Beyond the merch: register choreography as an on-chain rights record, then license and settle it in stablecoins. Approve, log the CID, get an Arcscan receipt.",
}: {
  treasuryAddress: string;
  eyebrow?: string;
  title?: string;
  blurb?: string;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-start">
      <Reveal>
        <div className="lg:sticky lg:top-28">
          <SectionHead eyebrow={eyebrow} title={title} blurb={blurb} />
          <div className="mt-8">
            <TreasuryCard address={treasuryAddress} />
          </div>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <MintForm />
      </Reveal>
    </div>
  );
}
