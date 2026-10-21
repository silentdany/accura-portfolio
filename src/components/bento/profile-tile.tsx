import { MapPin } from "lucide-react";
import type { Profile } from "@/lib/settings";

export function ProfileTile({ profile, projectCount }: { profile: Profile; projectCount: number }) {
  return (
    <section className="tile cell-lg flex flex-col justify-between p-6 sm:p-8 animate-rise">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle,var(--sand),transparent_65%)] opacity-70 dark:opacity-30" />
      <div className="relative flex items-center gap-3">
        {profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar} alt="" className="size-12 rounded-2xl object-cover ring-1 ring-line" />
        ) : (
          <span className="grid size-12 place-items-center rounded-2xl bg-ink font-serif text-2xl text-bg">{profile.name.slice(0, 1)}</span>
        )}
        {profile.available && (
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-ink-2">
            <span className="live-dot" />
            {profile.availability || "Disponible"}
          </span>
        )}
      </div>
      <div className="relative">
        <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-ink sm:text-7xl">
          {profile.name}
          <span className="text-clay">.</span>
        </h1>
        <p className="mt-4 max-w-md text-lg leading-snug text-ink-2 sm:text-xl">{profile.headline}</p>
        <p className="mt-3 line-clamp-3 max-w-md text-sm leading-relaxed text-muted">{profile.bio}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {profile.location}
            </span>
          )}
          <span className="font-mono">{projectCount} projets en ligne</span>
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="font-mono text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              {profile.email}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
