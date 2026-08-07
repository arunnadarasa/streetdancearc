import type { ReactNode } from "react";
import { Section } from "@/components/layout/Section";
import { H2aHome } from "@/components/h2a/H2aHome";
import { A2hHome } from "@/components/a2h/A2hHome";
import { GxHome } from "@/components/gx/GxHome";
import type { GxMode } from "@/lib/gx-mode";

/**
 * Single place that maps the global interface mode to what a page renders.
 *
 * - h2h → the page's own human UI (`children`)
 * - h2a → the human-delegates-to-agent surface
 * - a2h → the agent-initiates payout inbox
 * - a2a → the page's agent view, or the generic GX home when the page has none
 */
export function ModeSurface({
  mode,
  agent,
  children,
}: {
  mode: GxMode;
  /** The page's own A2A/agent view. Falls back to <GxHome /> when omitted. */
  agent?: ReactNode;
  children: ReactNode;
}) {
  if (mode === "h2h") return <>{children}</>;

  return (
    <Section tone="base" lines>
      {mode === "h2a" ? <H2aHome /> : mode === "a2h" ? <A2hHome /> : (agent ?? <GxHome />)}
    </Section>
  );
}
