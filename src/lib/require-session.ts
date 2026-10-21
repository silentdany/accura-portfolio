import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Server-side session proof. The proxy cookie check is only a fast filter. */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

export async function isAdmin(): Promise<boolean> {
  return Boolean(await getServerSession().catch(() => null));
}
