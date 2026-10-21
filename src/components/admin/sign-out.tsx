"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      title="Se déconnecter"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className="grid size-8 place-items-center rounded-full hover:bg-surface hover:text-ink"
    >
      <LogOut className="size-4" />
    </button>
  );
}
