import { ArrowUpRight } from "lucide-react";
import type { PublicThread } from "@/lib/portfolio";
import { formatDate } from "@/lib/format";

/** Narrative timeline of a thread: date rail, milestones, screenshots. */
export function Timeline({ thread }: { thread: PublicThread }) {
  if (!thread.posts.length) return null;
  return (
    <ol className="relative mt-6">
      <span aria-hidden className="absolute top-2 bottom-2 left-[7px] w-px bg-linear-to-b from-line-strong via-line to-transparent sm:left-[135px]" />
      {thread.posts.map((post, i) => (
        <li key={post.id} className="relative grid gap-2 pb-10 pl-8 sm:grid-cols-[120px_1fr] sm:gap-8 sm:pl-0 animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
          <time dateTime={post.date} className="pt-0.5 font-mono text-[11px] text-subtle sm:text-right">
            {formatDate(post.date)}
          </time>
          <span
            aria-hidden
            className={`absolute top-1 left-0 rounded-full border-2 border-bg sm:left-[128px] ${
              post.milestone ? "size-[15px] bg-clay ring-4 ring-clay/15" : "size-[15px] bg-line-strong"
            }`}
          />
          <div className="sm:pl-6">
            {post.title && <h3 className={`font-serif text-ink ${post.milestone ? "text-3xl" : "text-2xl"}`}>{post.title}</h3>}
            <p className="mt-1 max-w-2xl whitespace-pre-line leading-relaxed text-ink-2">{post.body}</p>
            {post.images.length > 0 && (
              <div className={`mt-4 grid gap-3 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"} max-w-2xl`}>
                {post.images.map((img) => (
                  <a key={img} href={img} target="_blank" rel="noopener" className="tile block overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" loading="lazy" className="w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
            {post.url && (
              <a href={post.url} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                Voir le post <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
