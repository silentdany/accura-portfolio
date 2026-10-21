/* eslint-disable @next/next/no-img-element */

/** The Accura mark: both files ship and CSS picks one (no theme flash). */
export function Logo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`relative block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <img src="/Accura.webp" alt="Accura" width={size} height={size} className="absolute inset-0 size-full object-contain dark:hidden" />
      <img src="/Accura_white.webp" alt="" aria-hidden width={size} height={size} className="absolute inset-0 hidden size-full object-contain dark:block" />
    </span>
  );
}
