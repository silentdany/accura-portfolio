import Link from "next/link";
import { Backdrop } from "@/components/backdrop";

export default function NotFound() {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden px-6">
      <Backdrop />
      <div className="text-center">
        <span className="eyebrow">404</span>
        <h1 className="headline mt-6">
          Rien <span className="accent-word">ici.</span>
        </h1>
        <p className="mt-3 text-muted">Ce projet a peut-être été masqué, ou n&apos;a jamais existé.</p>
        <Link href="/" className="btn btn-primary mt-8">
          Retour au portfolio
        </Link>
      </div>
    </main>
  );
}
