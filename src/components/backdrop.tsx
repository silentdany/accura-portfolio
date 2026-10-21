/** Hero decoration from accura.dev: hairline grid, two drifting red blooms, grain, vignette. */
export function Backdrop({ flip = false }: { flip?: boolean }) {
  return (
    <div aria-hidden className="grain pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="fade-bottom grid-lines absolute inset-0 opacity-70" />
      <div className={`bloom h-[38rem] w-[38rem] animate-drift ${flip ? "right-[-10rem] bottom-[-14rem]" : "top-[-12rem] left-[-8rem]"}`} />
      <div className={`bloom h-[30rem] w-[30rem] animate-drift [animation-delay:-11s] ${flip ? "top-[-10rem] left-[-6rem]" : "right-[-6rem] bottom-[-10rem]"}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--bg)_100%)]" />
    </div>
  );
}
