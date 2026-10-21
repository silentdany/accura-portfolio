/* eslint-disable @next/next/no-img-element */

/** Device frames around live captures. Pure, server- and client-safe. */

export function BrowserShot({
  src,
  domain,
  alt = "",
  className = "",
  imgClassName = "",
  eager = false,
}: {
  src: string;
  domain?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  return (
    <div className={`browser ${className}`}>
      <div className="browser-bar">
        <i />
        <i />
        <i />
        {domain && <span className="mx-auto truncate rounded-md bg-surface px-2.5 py-px font-mono text-[10px] text-subtle">{domain}</span>}
      </div>
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={`block w-full object-cover object-top ${imgClassName}`} />
    </div>
  );
}

export function PhoneShot({ src, alt = "", className = "", eager = false }: { src: string; alt?: string; className?: string; eager?: boolean }) {
  return (
    <div className={`phone ${className}`}>
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className="block aspect-[390/844] w-full rounded-[1.4rem] object-cover object-top" />
    </div>
  );
}

/** Placeholder window when there is no capture yet: hairline grid + monogram + domain. */
export function EmptyShot({ name, domain, className = "" }: { name: string; domain?: string | null; className?: string }) {
  return (
    <div className={`browser ${className}`}>
      <div className="browser-bar">
        <i />
        <i />
        <i />
        {domain && <span className="mx-auto truncate rounded-md bg-surface px-2.5 py-px font-mono text-[10px] text-subtle">{domain}</span>}
      </div>
      <div className="grid-lines relative grid h-full min-h-40 place-items-center bg-surface-2/40">
        <span className="text-6xl font-semibold tracking-[-0.06em] text-ink/15">{name.slice(0, 2)}</span>
      </div>
    </div>
  );
}
