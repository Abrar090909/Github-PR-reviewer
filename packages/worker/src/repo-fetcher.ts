import { exec as execCb } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { logger } from "./logger.js";

const exec = promisify(execCb);

// ─── Hard-exclude patterns (always ignored regardless of .gitignore) ──────────
const HARD_EXCLUDE_DIRS = new Set([
  "node_modules", ".next", ".nuxt", "dist", "build", "out", ".git", ".svn",
  "coverage", "__pycache__", ".pytest_cache", ".mypy_cache", "vendor", ".vendor",
  "target", "bin", "obj",
]);

// Only parse these source extensions for v1
const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".mts",
  ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs",
]);

// Max file size to parse (skip generated/minified files)
const MAX_FILE_BYTES = 500_000; // 500KB

/**
 * Shallow-clones the PR head branch into an ephemeral temp directory.
 * Returns the temp dir path. Caller MUST call cleanupSnapshot(dir) when done.
 *
 * Implements BACKEND_WORKING.md §2.1
 */
export async function fetchRepoSnapshot(
  installationToken: string,
  repoFullName: string,
  ref: string
): Promise<string> {
  const tmpDir = path.join(
    process.env.TEMP ?? process.env.TMP ?? "/tmp",
    `contour-${crypto.randomUUID()}`
  );

  const authedUrl = `https://x-access-token:${installationToken}@github.com/${repoFullName}.git`;

  logger.info({ repoFullName, ref, tmpDir }, "Cloning repo snapshot");

  try {
    // --single-branch limits what's fetched; --depth 1 gets only latest commit
    await exec(
      `git clone --depth 1 --branch ${escapeShell(ref)} --single-branch ${authedUrl} ${tmpDir}`,
      { timeout: 120_000 } // 2-minute timeout for large repos
    );
  } catch (err: any) {
    await cleanupSnapshot(tmpDir).catch(() => undefined);
    throw new Error(`Git clone failed for ${repoFullName}@${ref}: ${err.message}`);
  }

  logger.info({ repoFullName, ref, tmpDir }, "Clone complete");
  return tmpDir;
}

/**
 * Removes the ephemeral snapshot directory.
 * Always call this in a finally block after using fetchRepoSnapshot().
 */
export async function cleanupSnapshot(tmpDir: string): Promise<void> {
  if (!tmpDir || !tmpDir.includes("contour-")) return; // safety guard
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
    logger.info({ tmpDir }, "Snapshot cleaned up");
  } catch (err) {
    logger.warn({ tmpDir, err }, "Failed to clean up snapshot dir -- ignoring");
  }
}

/**
 * Returns the source files from a cloned repo that should be parsed.
 * In PR mode (diffFiles provided), only checks files changed in the diff.
 * In baseline mode (no diffFiles), walks the whole repo.
 *
 * Implements BACKEND_WORKING.md §2.2
 */
export async function filterSourceFiles(
  repoDir: string,
  diffFiles?: string[]
): Promise<string[]> {
  if (diffFiles && diffFiles.length > 0) {
    // PR mode: only parse files changed in the diff
    const results: string[] = [];
    for (const relPath of diffFiles) {
      const absPath = path.join(repoDir, relPath);
      if (!isSourceExtension(relPath)) continue;
      if (isInExcludedDir(relPath)) continue;
      try {
        const stat = await fs.stat(absPath);
        if (stat.size > MAX_FILE_BYTES) {
          logger.debug({ relPath, size: stat.size }, "Skipping oversized file");
          continue;
        }
        results.push(relPath);
      } catch {
        // File doesn't exist in this branch -- deleted file, skip
        continue;
      }
    }
    return results;
  }

  // Baseline mode: walk entire repo
  return walkDir(repoDir, repoDir);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function walkDir(baseDir: string, currentDir: string): Promise<string[]> {
  const results: string[] = [];

  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (HARD_EXCLUDE_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;
      results.push(...await walkDir(baseDir, path.join(currentDir, entry.name)));
    } else if (entry.isFile()) {
      if (!isSourceExtension(entry.name)) continue;
      const absPath = path.join(currentDir, entry.name);
      const relToBase = path.relative(baseDir, absPath).replace(/\\/g, "/");
      if (isInExcludedDir(relToBase)) continue;
      try {
        const stat = await fs.stat(absPath);
        if (stat.size > MAX_FILE_BYTES) continue;
        results.push(relToBase);
      } catch {
        continue;
      }
    }
  }

  return results;
}

function isSourceExtension(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isInExcludedDir(relPath: string): boolean {
  return relPath.split(/[/\\]/).some(
    (part) => HARD_EXCLUDE_DIRS.has(part) || (part.startsWith(".") && part !== ".github")
  );
}

function escapeShell(arg: string): string {
  // Sanitize ref name to prevent injection
  if (!/^[a-zA-Z0-9_\-./:]+$/.test(arg)) {
    throw new Error(`Unsafe ref name: ${arg}`);
  }
  return arg;
}
