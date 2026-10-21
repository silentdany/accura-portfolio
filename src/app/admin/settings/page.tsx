import { CheckCircle2, CircleDashed } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDefaultView, getProfile } from "@/lib/settings";
import { env, siteUrl } from "@/lib/env";
import { aiEnabled } from "@/lib/ai";
import { watchEnabled } from "@/lib/watch";
import { formatDate, relativeTime } from "@/lib/format";
import { Card } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import type { SyncStats } from "@/lib/sync";

export default async function AdminSettings() {
  const [profile, defaultView, runs] = await Promise.all([
    getProfile(),
    getDefaultView(),
    prisma.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 8 }),
  ]);
  const base = siteUrl();
  const checks = [
    { label: "Vercel (VERCEL_TOKEN)", ok: Boolean(env.vercelToken()), hint: "Liste des projets déployés." },
    { label: `GitHub (GITHUB_TOKEN, owner ${env.githubOwner()})`, ok: Boolean(env.githubToken()), hint: "Sans token : 60 requêtes/h, repos publics uniquement." },
    { label: "Accura Watch (WATCH_URL + WATCH_TOKEN)", ok: watchEnabled(), hint: "Chiffres réels sur les cartes." },
    { label: `AI gateway (AI_GATEWAY_URL + AI_GATEWAY_API_KEY, ${env.aiModel()})`, ok: aiEnabled(), hint: "Optionnel : descriptions enrichies." },
    { label: "API en écriture (PORTFOLIO_API_TOKEN)", ok: Boolean(env.apiToken()), hint: "Bots Grok, Claude, sync à distance." },
    { label: "Cron (CRON_SECRET)", ok: Boolean(env.cronSecret()), hint: "Sync hebdomadaire Vercel Cron." },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <h1 className="title text-3xl text-ink">Réglages</h1>
        <Card title="Profil" description="Tuile de présentation, liens façon Linktree, export PDF et API get_profile.">
          <SettingsForm profile={profile} defaultView={defaultView} />
        </Card>
      </div>
      <div className="flex flex-col gap-6 lg:pt-14">
        <Card title="Intégrations">
          <ul className="flex flex-col gap-3">
            {checks.map((c) => (
              <li key={c.label} className="flex gap-2.5 text-sm">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-live" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-subtle" />}
                <span>
                  <span className="text-ink">{c.label}</span>
                  <span className="block text-xs text-muted">{c.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="API & MCP">
          <dl className="grid gap-2 font-mono text-xs break-all">
            <dt className="text-subtle">MCP</dt>
            <dd className="text-ink">{base}/api/mcp</dd>
            <dt className="text-subtle">REST</dt>
            <dd className="text-ink">{base}/api/v1</dd>
            <dt className="text-subtle">Brief quotidien</dt>
            <dd className="text-ink">POST {base}/api/v1/now/brief</dd>
          </dl>
        </Card>
        <Card title="Synchronisations">
          {runs.length === 0 && <p className="text-sm text-muted">Aucune synchronisation pour l&apos;instant.</p>}
          <ul className="flex flex-col gap-2">
            {runs.map((r) => {
              const s = r.stats as SyncStats | null;
              return (
                <li key={r.id} className="text-sm">
                  <span className={r.ok ? "text-live" : r.ok === false ? "text-danger" : "text-muted"}>●</span>{" "}
                  <span className="text-ink" title={formatDate(r.startedAt)}>
                    {relativeTime(r.startedAt)}
                  </span>{" "}
                  <span className="text-xs text-muted">
                    ({r.trigger}) {s ? `${s.detected} détectés, ${s.created} nouveaux, ${s.updated} maj` : ""}
                  </span>
                  {r.error && <p className="text-xs text-danger">{r.error}</p>}
                  {s?.errors?.slice(0, 3).map((e, i) => (
                    <p key={i} className="truncate text-xs text-danger" title={e.error}>
                      {e.project} : {e.error}
                    </p>
                  ))}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
