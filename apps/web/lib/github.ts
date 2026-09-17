import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

/**
 * Creates an Octokit client authenticated as the GitHub App itself
 * (used for app-level operations, not installation-scoped).
 */
export function createAppOctokit(): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: getPrivateKey(),
    },
  });
}

/**
 * Creates an installation-scoped Octokit client.
 * Installation tokens are cached by Octokit's auth plugin for up to 1 hour.
 */
export function createInstallationOctokit(installationId: number): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: getPrivateKey(),
      installationId,
    },
  });
}

function getPrivateKey(): string {
  const encoded = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!encoded) throw new Error("GITHUB_APP_PRIVATE_KEY is not set");
  // Support both raw PEM and base64-encoded PEM
  if (encoded.startsWith("-----BEGIN")) return encoded;
  return Buffer.from(encoded, "base64").toString("utf-8");
}
