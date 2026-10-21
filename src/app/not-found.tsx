import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grain grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="font-mono text-xs text-subtle">404</p>
        <h1 className="mt-3 font-serif text-6xl text-ink">Rien ici.</h1>
        <p className="mt-3 text-muted">Ce projet a peut-être été masqué, ou n&apos;a jamais existé.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm text-bg">
          Retour au portfolio
        </Link>
      </div>
    </main>
  );
}
