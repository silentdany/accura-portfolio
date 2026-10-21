"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { setPrefCookie } from "@/lib/client-cookie";

const ORDER: Theme[] = ["system", "light", "dark"];
const ICON = { system: Monitor, light: Sun, dark: Moon };
const LABEL = { system: "Thème : système", light: "Thème : clair", dark: "Thème : sombre" };

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const Icon = ICON[theme];
  function next() {
    const t = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(t);
    setPrefCookie(THEME_COOKIE, t);
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }
  return (
    <button
      type="button"
      onClick={next}
      title={LABEL[theme]}
      aria-label={LABEL[theme]}
      className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  );
}
