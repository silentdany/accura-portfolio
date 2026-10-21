# Accura Portfolio

Portfolio automatisé de [Accura](https://accura.dev), déployé sur `portfolio.accura.dev` : une grille bento (entre Bento, Linktree et own.page) qui se remplit toute seule depuis Vercel et GitHub, avec les vrais chiffres d'[Accura Watch](https://github.com/silentdany/accura-watch), une page `/now`, des stories, l'export PDF, et une API REST + MCP sur la même base.

**Stack** : Next.js 16 (App Router) · Prisma 6 + Neon (Postgres) · Tailwind 4 · Better Auth · Playwright (PDF).

## Ce que ça fait

| | |
|---|---|
| **Captures live** | À chaque sync, Chromium headless photographie chaque site en prod (desktop 1440×900 et mobile 390×844, bannières cookies masquées) si la capture manque, date de plus de 6 jours ou si l'URL a changé. Elles sont stockées en base (≈ 60 Ko chacune), servies par `/api/captures/[slug]/[kind]` avec un cache immuable, et intégrées partout : cartes bento (fenêtre navigateur, téléphone, ou les deux), page projet, PDF et image OG. Si Chromium ne démarre pas ou qu'une capture échoue, l'API Microlink prend le relais automatiquement (`MICROLINK_API_KEY` facultatif, `CAPTURE_FALLBACK=off` pour couper). Une page derrière Vercel Authentication ou une page d'erreur est refusée : jamais d'écran de login sur le portfolio. Le domaine capturé est celui qui ressemble au nom du projet (une app multi-domaines ne prend pas le domaine d'une autre). Bouton « Recapturer » dans l'admin. `SYNC_CAPTURES=false` pour désactiver. |
| **Icônes** | La sync récupère l'icône de chaque site (apple-touch-icon, sinon la plus grande favicon déclarée, SVG compris, sinon `/favicon.ico`), la stocke avec les captures et la sert depuis le portfolio. Aucun service tiers ; sans icône, la carte affiche un monogramme, jamais une image cassée. |
| **Sync** | Cron hebdomadaire (`vercel.json`, lundi 6 h UTC) → `/api/cron/sync`. Liste les projets Vercel avec un déploiement de prod `READY`, les croise avec les repos GitHub de `GITHUB_OWNER` (nom, description, URL de prod, dernière mise à jour, langages, topics, étoiles, captures du README et des dossiers `screenshots/`, `og:image` de la prod). Les repos avec une homepage mais sans projet Vercel sont inclus aussi. |
| **IA (optionnel)** | Avec `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY` (passerelle compatible OpenAI), chaque carte reçoit une accroche et une description générées à partir des données brutes. Ce n'est relancé que si ces données changent. |
| **Admin** (`/admin`) | Better Auth, un seul propriétaire. Glisser-déposer des cartes, épinglage, masquage, taille de carte (1×1, 2×1, 1×2, 2×2), surcharge de chaque champ synchronisé, catégories multiples, mode NDA, correspondance avec Watch, projets manuels, sync à la demande. |
| **Catégories** | Sérieux, Clients, Fun, Jeux, Perso (seed), modifiables. Filtre instantané sur la page publique (`/?c=jeux`). |
| **NDA** | Titre et phrase de contexte publics ; le reste (captures, stack, liens, chiffres) est derrière un mot de passe. Le cookie de déverrouillage est signé, valable 30 jours, et révoqué si le mot de passe change. L'API et le MCP ne renvoient que la version verrouillée. |
| **Affichages** | `accura` (le design system d'accura.dev : encre sur blanc, accent rouge, ton « night » en sombre, Geist) et `raw` (HTML pur façon bellard.org). Choix avec `?view=raw`, mémorisé dans un cookie ; l'affichage par défaut se règle dans l'admin. Pour en ajouter un : `src/lib/views.ts`. |
| **Analytics** | Aucun tracker maison : un appel `get_overview` à Watch (`POST /api/v1/tools/get_overview`, mis en cache 15 min) alimente toutes les cartes (visiteurs, clics Search Console, erreurs Sentry, uptime). Correspondance par slug Watch (admin) ou, à défaut, par domaine. |
| **Now** (`/now`) | Un seul thread actif : le brief du jour (envoyé par les bots Grok), le fil de posts, et les commits GitHub des 7 derniers jours groupés par repo. Démarrer un nouveau thread archive l'actuel, qui devient `/stories/[slug]` avec sa timeline complète. |
| **PDF** | Bouton PDF dans l'en-tête : tout le portfolio, une catégorie ou un projet. Chromium headless (`@sparticuz/chromium` sur Vercel) rend `/print`. |
| **SEO** | Metadata complètes, images OG dynamiques par projet et par story, `sitemap.xml`, `robots.txt`, JSON-LD, `llms.txt`. |

## API REST + MCP

Le même schéma derrière les deux : chaque endpoint REST est une enveloppe fine d'un outil MCP (`src/lib/mcp/tools.ts`). La lecture est publique ; l'écriture demande `Authorization: Bearer $PORTFOLIO_API_TOKEN`.

- **MCP** (Streamable HTTP, JSON-RPC, sans état) : `POST /api/mcp`
  - Lecture : `get_profile`, `list_projects`, `get_project`, `list_categories`, `get_now`, `list_stories`, `get_story`
  - Écriture : `set_now_brief`, `add_thread_post`, `start_thread`, `archive_thread`, `sync_projects`
- **REST** : index sur `GET /api/v1`, miroir de tous les outils sur `POST /api/v1/tools/<name>`, plus `GET /projects`, `/projects/:slug`, `/categories`, `/now`, `/stories`, `/stories/:slug`, `/profile`, et `POST /now/brief`, `/now/posts`, `/threads`, `/threads/:slug/archive`, `/sync`.

Brief quotidien d'un bot :

```bash
curl -X POST https://portfolio.accura.dev/api/v1/now/brief \
  -H "Authorization: Bearer $PORTFOLIO_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Netcode stabilisé à 60 joueurs. Aujourd'\''hui : le loot."}'
```

Brancher Claude (ou tout autre client MCP) : ajouter `https://portfolio.accura.dev/api/mcp` comme connecteur distant.

## Démarrer

```bash
pnpm install
cp .env.example .env      # remplir DATABASE_URL, BETTER_AUTH_SECRET, etc.
pnpm db:push && pnpm db:seed
pnpm dev                  # http://localhost:3000, puis /login pour créer le compte propriétaire
pnpm sync                 # sync ponctuelle en local
```

Contrôles : `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Déploiement (Vercel)

1. Créer le projet depuis ce repo, ajouter le domaine `portfolio.accura.dev`.
2. Brancher Neon (intégration Vercel) et renseigner les variables de `.env.example`.
3. Le build de Vercel (`vercel-build`) applique le schéma (`prisma db push`), seed les catégories puis compile. Le cron est déclaré dans `vercel.json`.
4. Aller sur `/login` pour créer le compte propriétaire (limité à `OWNER_EMAIL`), puis cliquer « Synchroniser » dans l'admin.

## Phase 2 (pas encore implémentée)

Portail d'authentification unifié sur accura.dev (`/login` ou `auth.accura.dev`) : Better Auth partage la session via un cookie `domain=.accura.dev` entre Watch, Portfolio et le site principal. Le crochet est déjà prévu : `AUTH_COOKIE_DOMAIN=.accura.dev` active `crossSubDomainCookies` dans `src/lib/auth.ts`.
