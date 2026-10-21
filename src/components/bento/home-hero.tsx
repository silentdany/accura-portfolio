/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { Backdrop } from "@/components/backdrop";
import { CONTACT_URL } from "@/components/site-header";
import type { Profile } from "@/lib/settings";
import type { PublicProject, PublicThread } from "@/lib/portfolio";
import { formatNumber } from "@/lib/format";

/** First screen, in the accura.dev hero grammar: badge, two-line headline with one accent word, two CTAs, a facts rule. */
export function HomeHero({ profile, projects, thread }: { profile: Profile; projects: PublicProject[]; thread: PublicThread | null }) {
  const stats = projects.map((p) => p.stats).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const visitors = stats.reduce((a, s) => a + (s.visitors ?? 0), 0);
  const live = projects.filter((p) => p.url || p.locked).length;
  return (
    <section className="relative isolate overflow-hidden px-5 pt-20 pb-16 sm:px-8 md:pt-28 md:pb-20">
      <Backdrop />
      <div className="shell relative">
        <div className="flex flex-wrap items-center gap-3 animate-reveal">
          {profile.avatar && <img src={profile.avatar} alt={profile.name} className="size-9 rounded-full object-cover ring-2 ring-bg" />}
          <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 py-1.5 pr-4 pl-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            <span aria-hidden className={`size-1.5 rounded-full ${profile.available ? "bg-primary" : "bg-subtle"}`} />
            {profile.available ? profile.availability || "Disponible" : profile.name}
          </p>
        </div>

        <h1 className="headline mt-8 max-w-5xl animate-reveal [animation-delay:90ms]">
          <span className="block">{profile.headline}</span>{" "}
          {(profile.headlineTail || profile.headlineAccent) && (
            <span className="block text-muted">
              {profile.headlineTail} {profile.headlineAccent && <span className="accent-word">{profile.headlineAccent}</span>}
            </span>
          )}
        </h1>

        <p className="mt-8 max-w-2xl animate-reveal text-lg leading-relaxed text-muted [animation-delay:180ms] sm:text-xl">{profile.bio}</p>

        <div className="mt-10 flex animate-reveal flex-col gap-3 [animation-delay:260ms] sm:flex-row sm:items-center">
          <a href={CONTACT_URL} className="btn btn-primary btn-lg group">
            Parlons de votre projet
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a href="#projets" className="btn btn-outline btn-lg">
            Voir les projets <ArrowDown className="size-4" />
          </a>
        </div>

        <div className="mt-14 flex animate-reveal flex-wrap items-center gap-x-10 gap-y-4 border-t border-line pt-6 text-sm text-muted [animation-delay:400ms]">
          <p>
            <b className="font-semibold text-ink tabular-nums">{live}</b> projets en ligne
          </p>
          {stats.length > 0 && (
            <p>
              <b className="font-semibold text-ink tabular-nums">{formatNumber(visitors)}</b> visiteurs sur 28 jours
            </p>
          )}
          {thread && (
            <p>
              En ce moment :{" "}
              <Link href="/now" className="group inline-flex items-center gap-1 font-medium text-ink link-underline">
                {thread.title}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </p>
          )}
          {profile.location && (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {profile.location}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 md:ml-auto">
            {profile.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer me" className="inline-flex items-center gap-0.5 font-medium text-ink-2 hover:text-primary">
                {l.label}
                <ArrowUpRight className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
