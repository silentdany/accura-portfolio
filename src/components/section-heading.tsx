export function SectionHeading({ eyebrow, title, lede, id, children }: { eyebrow: string; title: React.ReactNode; lede?: string; id?: string; children?: React.ReactNode }) {
  return (
    <div id={id} className="mb-10 flex flex-col gap-5 scroll-mt-24 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-4xl flex-col gap-5">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="headline-sm">{title}</h2>
        {lede && <p className="max-w-2xl text-lg leading-relaxed text-muted">{lede}</p>}
      </div>
      {children}
    </div>
  );
}
