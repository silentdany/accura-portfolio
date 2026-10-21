import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/require-session";
import { LoginForm } from "./login-form";
import { Backdrop } from "@/components/backdrop";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getServerSession()) redirect("/admin");
  const sp = await searchParams;
  const hasOwner = (await prisma.user.count()) > 0;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/admin";
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden px-4">
      <Backdrop />
      <div className="tile w-full max-w-sm p-8">
        <Logo size={32} />
        <h1 className="mt-6 title text-3xl text-ink">{hasOwner ? "Bon retour." : "Créer le compte."}</h1>
        <p className="mt-2 text-sm text-muted">
          {hasOwner ? "Admin du portfolio." : "Premier lancement : ce compte devient le propriétaire, les inscriptions se ferment ensuite."}
        </p>
        <LoginForm mode={hasOwner ? "signin" : "signup"} next={next} />
      </div>
    </main>
  );
}
