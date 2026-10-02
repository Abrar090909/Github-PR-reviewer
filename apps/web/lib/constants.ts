export const GITHUB_REPOSITORY_URL =
  "https://github.com/Abrar090909/Github-PR-reviewer";

export const GITHUB_APP_INSTALL_URL =
  process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ||
  (process.env.NEXT_PUBLIC_GITHUB_APP_SLUG
    ? `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`
    : `${GITHUB_REPOSITORY_URL}#github-app`);
