/**
 * GitHub repository stats for tool detail pages.
 *
 * Server-only helper: parses a githubUrl to owner/repo, fetches the public
 * repo record with 24h caching, and returns the small subset the OpenStore
 * style stats strip needs. Returns null on any failure so pages hide the
 * cells instead of showing fake numbers.
 */

export type GithubStats = {
  fullName: string;
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  language: string | null;
  pushedAt: string | null;
  defaultBranch: string | null;
  repoUrl: string;
  issuesUrl: string;
};

export function parseGithubRepo(
  url: string | null | undefined,
): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url
    .trim()
    .replace(/\/$/, "")
    .match(/github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  if (!m) return null;
  const owner = m[1].replace(/\.git$/, "");
  const repo = m[2].replace(/\.git$/, "");
  if (!owner || !repo) return null;
  return { owner, repo };
}

function formatLicense(spdx: string | null | undefined, name: string | null | undefined): string | null {
  if (spdx && spdx !== "NOASSERTION") return spdx;
  if (name) return name;
  return null;
}

export async function getGithubStats(
  githubUrl: string | null | undefined,
): Promise<GithubStats | null> {
  const parsed = parseGithubRepo(githubUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "prother-dev",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(apiUrl, {
      headers,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      full_name?: string;
      stargazers_count?: number;
      forks_count?: number;
      open_issues_count?: number;
      license?: { spdx_id?: string | null; name?: string | null } | null;
      language?: string | null;
      pushed_at?: string | null;
      default_branch?: string | null;
      html_url?: string | null;
    };
    if (typeof data.stargazers_count !== "number") return null;
    const repoUrl =
      data.html_url ?? `https://github.com/${owner}/${repo}`;
    return {
      fullName: data.full_name ?? `${owner}/${repo}`,
      owner,
      repo,
      stars: data.stargazers_count,
      forks: typeof data.forks_count === "number" ? data.forks_count : 0,
      openIssues:
        typeof data.open_issues_count === "number" ? data.open_issues_count : 0,
      license: formatLicense(
        data.license?.spdx_id,
        data.license?.name,
      ),
      language: data.language ?? null,
      pushedAt: data.pushed_at ?? null,
      defaultBranch: data.default_branch ?? null,
      repoUrl,
      issuesUrl: `${repoUrl}/issues`,
    };
  } catch {
    return null;
  }
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
