import { createAppAuth } from "@octokit/auth-app";

const TOKEN_CACHE = new Map<number, { token: string; expiresAt: Date }>();

/**
 * Mints a short-lived installation access token for the given installation ID.
 * Tokens are cached for up to 55 minutes (GitHub issues 60-min tokens).
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  const cached = TOKEN_CACHE.get(installationId);
  if (cached && cached.expiresAt > new Date()) {
    return cached.token;
  }

  // App JWT (valid for 10 minutes, used to mint an installation token)
  const appJwt = await mintAppJwt();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get installation token: ${response.statusText}`);
  }

  const data = (await response.json()) as { token: string; expires_at: string };

  const expiresAt = new Date(data.expires_at);
  expiresAt.setMinutes(expiresAt.getMinutes() - 5); // 5-min buffer

  TOKEN_CACHE.set(installationId, { token: data.token, expiresAt });
  return data.token;
}

async function mintAppJwt(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!;

  const decodedKey = privateKey.startsWith("-----BEGIN")
    ? privateKey
    : Buffer.from(privateKey, "base64").toString("utf-8");

  const auth = createAppAuth({
    appId: parseInt(appId, 10),
    privateKey: decodedKey,
  });

  const appAuthentication = await auth({ type: "app" });
  return appAuthentication.token;
}
