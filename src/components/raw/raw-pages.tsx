/* eslint-disable @next/next/no-html-link-for-pages -- the raw view is plain HTML on purpose (no client navigation). */
import type { PublicProject, PublicThread } from "@/lib/portfolio";
import type { Profile } from "@/lib/settings";
import type { CommitGroup } from "@/lib/now";
import { formatDate, formatNumber } from "@/lib/format";

export function RawHome({ profile, projects, thread }: { profile: Profile; projects: PublicProject[]; thread: PublicThread | null }) {
  const byCat = new Map<string, PublicProject[]>();
  for (const p of projects) {
    const key = p.categories[0]?.name ?? "Projets";
    byCat.set(key, [...(byCat.get(key) ?? []), p]);
  }
  return (
    <>
      <h1>{profile.name}</h1>
      <p>{profile.headline}</p>
      <p>{profile.bio}</p>
      {profile.email && (
        <p>
          E-mail : <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      )}
      {thread && (
        <p>
          <b>En ce moment :</b> <a href="/now?view=raw">{thread.title}</a>
          {thread.brief ? ` — ${thread.brief}` : ""}
        </p>
      )}
      {[...byCat.entries()].map(([cat, list]) => (
        <div key={cat}>
          <h2>{cat}</h2>
          <ul>
            {list.map((p) => (
              <li key={p.slug}>
                {p.url ? <a href={p.url}>{p.name}</a> : <b>{p.name}</b>}: {p.locked ? p.ndaContext : p.tagline}
                {p.locked ? " (sous NDA)" : ""} [<a href={`/projects/${p.slug}?view=raw`}>détails</a>]
                {p.stats?.visitors ? <small> — {formatNumber(p.stats.visitors)} visiteurs/28 j</small> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <h2>Liens</h2>
      <ul>
        {profile.links.map((l) => (
          <li key={l.url}>
            <a href={l.url}>{l.label}</a>
          </li>
        ))}
      </ul>
    </>
  );
}

export function RawProject({ p, unlockForm }: { p: PublicProject; unlockForm?: React.ReactNode }) {
  return (
    <>
      <h1>{p.name}</h1>
      {p.locked ? (
        <>
          <p>{p.ndaContext}</p>
          <p>Ce projet est sous NDA. Les détails sont protégés par un mot de passe.</p>
          {unlockForm}
        </>
      ) : (
        <>
          <p>
            <i>{p.tagline}</i>
          </p>
          {p.description && <p>{p.description}</p>}
          <table>
            <tbody>
              {p.url && (
                <tr>
                  <td>Site</td>
                  <td>
                    <a href={p.url}>{p.domain}</a>
                  </td>
                </tr>
              )}
              {p.repoUrl && (
                <tr>
                  <td>Code</td>
                  <td>
                    <a href={p.repoUrl}>{p.repoUrl.replace("https://", "")}</a>
                  </td>
                </tr>
              )}
              {p.languages.length > 0 && (
                <tr>
                  <td>Langages</td>
                  <td>{p.languages.join(", ")}</td>
                </tr>
              )}
              {p.categories.length > 0 && (
                <tr>
                  <td>Catégories</td>
                  <td>{p.categories.map((c) => c.name).join(", ")}</td>
                </tr>
              )}
              <tr>
                <td>Mis à jour</td>
                <td>{formatDate(p.lastUpdatedAt)}</td>
              </tr>
              {p.stats && (
                <tr>
                  <td>Audience (28 j)</td>
                  <td>
                    {formatNumber(p.stats.visitors)} visiteurs, {formatNumber(p.stats.clicks)} clics Google, {formatNumber(p.stats.unresolved)} erreurs ouvertes,{" "}
                    {p.stats.status === "up" ? "en ligne" : p.stats.status === "down" ? "hors ligne" : "statut inconnu"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {p.screenshots.length > 0 && (
            <>
              <h3>Captures</h3>
              <ul>
                {p.screenshots.map((s, i) => (
                  <li key={s}>
                    <a href={s}>capture {i + 1}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <p>
        <a href="/?view=raw">&larr; tous les projets</a>
      </p>
    </>
  );
}

export function RawNow({ thread, commits }: { thread: PublicThread | null; commits: CommitGroup[] }) {
  return (
    <>
      <h1>Now</h1>
      {thread ? (
        <>
          <h2>{thread.title}</h2>
          {thread.brief && <p>{thread.brief}</p>}
          {thread.briefAt && (
            <p>
              <small>Brief du {formatDate(thread.briefAt)}</small>
            </p>
          )}
          {thread.posts.length > 0 && <RawTimeline thread={thread} />}
        </>
      ) : (
        <p>Aucun thread actif.</p>
      )}
      <h2>Commits des 7 derniers jours</h2>
      {commits.length === 0 && <p>Aucun commit public cette semaine.</p>}
      {commits.map((g) => (
        <div key={g.repo}>
          <h3>
            <a href={g.url}>{g.repo}</a> ({g.commits.length})
          </h3>
          <ul>
            {g.commits.map((c) => (
              <li key={c.sha}>
                <code>
                  <a href={c.url}>{c.sha}</a>
                </code>{" "}
                {c.message} <small>({formatDate(c.date, true)})</small>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export function RawTimeline({ thread }: { thread: PublicThread }) {
  return (
    <ol>
      {thread.posts.map((p) => (
        <li key={p.id}>
          <small>{formatDate(p.date)}</small> — {p.title ? <b>{p.title}. </b> : null}
          {p.body} {p.url && <a href={p.url}>[lien]</a>}{" "}
          {p.images.map((img, i) => (
            <a key={img} href={img}>
              [image {i + 1}]{" "}
            </a>
          ))}
        </li>
      ))}
    </ol>
  );
}

export function RawStories({ stories }: { stories: PublicThread[] }) {
  return (
    <>
      <h1>Stories</h1>
      {stories.length === 0 && <p>Aucune story archivée pour l&apos;instant.</p>}
      <ul>
        {stories.map((s) => (
          <li key={s.slug}>
            <a href={`/stories/${s.slug}?view=raw`}>{s.title}</a> — {formatDate(s.startedAt)} → {formatDate(s.archivedAt)} ({s.posts.length} posts)
          </li>
        ))}
      </ul>
    </>
  );
}
