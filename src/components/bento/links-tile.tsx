import { ArrowUpRight } from "lucide-react";
import type { Profile } from "@/lib/settings";
import { hostname } from "@/lib/slug";

/** Linktree-style stack of links. */
export function LinksTile({ links }: { links: Profile["links"] }) {
  if (!links.length) return null;
  return (
    <section className="tile cell-sm flex flex-col justify-center p-2.5 animate-rise [animation-delay:60ms]">
      <ul className="flex flex-col gap-1" aria-label="Liens">
        {links.slice(0, 4).map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer me"
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-2.5 py-[7px] transition hover:border-line-strong hover:bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${hostname(l.url)}&sz=64`}
                alt=""
                className="size-4 rounded"
                loading="lazy"
              />
              <span className="flex-1 truncate text-sm font-medium text-ink">{l.label}</span>
              <ArrowUpRight className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
