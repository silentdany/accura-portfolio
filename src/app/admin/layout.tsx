import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
// "Synchroniser" and "Recapturer" are server actions of these pages; the sync stops itself at 250 s.
export const maxDuration = 300;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireSession();
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Logo size={22} />
            <span className="font-semibold tracking-tight text-ink">
              Accura<span className="text-muted">.dev</span> <span className="font-normal text-subtle">/ admin</span>
            </span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-3 text-xs text-muted">
            <span className="hidden sm:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
