import { LakeLines } from "./LakeLines";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  as: Tag = "h2",
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-6 ${align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"}`}>
      <div className={align === "center" ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <Tag className={`text-ivory ${Tag === "h1" ? "text-5xl leading-[1.02] sm:text-6xl lg:text-7xl" : "text-4xl leading-[1.05] sm:text-5xl"}`}>{title}</Tag>
        {lead && <p className="mt-5 max-w-xl text-base leading-relaxed text-mist sm:text-lg">{lead}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

/** Header band for inner pages. */
export function PageHero({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <section className="grain relative -mt-[4.5rem] overflow-hidden border-b border-white/[0.06] bg-night-950 pb-14 pt-36 lg:-mt-20 lg:pb-20 lg:pt-44">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(196,162,101,0.14),transparent_55%)]" aria-hidden />
      <LakeLines className="pointer-events-none absolute -right-48 top-0 h-[30rem] w-[64rem] text-gold-400/[0.07]" />
      <div className="container-x relative">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} lead={lead}>
          {children}
        </SectionHeading>
      </div>
    </section>
  );
}
