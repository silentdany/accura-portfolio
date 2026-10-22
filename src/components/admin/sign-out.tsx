"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <button
      type="button"
      title="Se déconnecter"
      onClick={async () => {
        try {
          await signOut();
        } finally {
          // Client navigation keeps the RSC cache from the signed-in render. A full load does not.
          window.location.assign("/");
        }
      }}
      className="grid size-8 place-items-center rounded-full hover:bg-surface hover:text-ink"
    >
      <LogOut className="size-4" />
    </button>
  );
}
