import { getCommitsSince, recentlyPushedRepos } from "@/lib/github";

export type CommitGroup = {
  repo: string;
  url: string;
  commits: { sha: string; message: string; url: string; date: string }[];
};

/** GitHub commits of the last `days` days, grouped by repo (most active first). Cached 30 min. */
export async function recentCommits(repos: string[], days = 7): Promise<CommitGroup[]> {
  const since = new Date(Date.now() - days * 86400_000);
  const list = repos.length ? repos : await recentlyPushedRepos(since).catch(() => []);
  const groups = await Promise.all(
    list.slice(0, 12).map(async (repo): Promise<CommitGroup> => {
      const commits = await getCommitsSince(repo, since).catch(() => []);
      return {
        repo,
        url: `https://github.com/${repo}`,
        commits: commits.map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0].slice(0, 140),
          url: c.html_url,
          date: c.commit.author?.date ?? new Date().toISOString(),
        })),
      };
    }),
  );
  return groups.filter((g) => g.commits.length).sort((a, b) => b.commits.length - a.commits.length);
}
