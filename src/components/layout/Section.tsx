import type { ReactNode } from "react";

type Tone = "base" | "raised" | "deep";

const TONES: Record<Tone, string> = {
  base: "bg-background",
  raised: "bg-surface-2",
  deep: "bg-[color-mix(in_oklab,var(--panel)_28%,var(--background))]",
};

/**
 * Full-bleed band with a max-width rail inside. Alternating tones give the
 * page vertical rhythm as you scroll.
 */
export function Section({
  children,
  tone = "base",
  className = "",
  innerClassName = "",
  id,
  lines = false,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  innerClassName?: string;
  id?: string;
  lines?: boolean;
}) {
  return (
    <section
      id={id}
      className={`relative w-full border-t border-border/60 ${TONES[tone]} ${className}`}
    >
      {lines && (
        <div
          aria-hidden
          className="grid-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)]"
        />
      )}
      <div className={`rail relative py-14 sm:py-20 lg:py-16 xl:py-20 ${innerClassName}`}>{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  blurb,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  blurb?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="display mt-3 text-3xl text-foreground sm:text-5xl">{title}</h2>
      {blurb && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{blurb}</p>}
    </div>
  );
}
