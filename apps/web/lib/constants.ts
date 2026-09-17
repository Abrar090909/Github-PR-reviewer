export const GITHUB_APP_SLUG =
  process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "pr-reviewer-2026";

export const GITHUB_APP_INSTALL_URL =
  process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ||
  `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;
