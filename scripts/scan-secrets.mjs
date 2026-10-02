import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const paths = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const secretPatterns = [
  /AIza[0-9A-Za-z_-]{30,}/g,
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/g,
  /\bvcp_[A-Za-z0-9]{24,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /(?:^|[\s'"])(?:GITHUB_APP_PRIVATE_KEY|GITHUB_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY|UPSTASH_REDIS_(?:REST_)?TOKEN|QSTASH_(?:TOKEN|CURRENT_SIGNING_KEY|NEXT_SIGNING_KEY)|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|TYPESAFE_API_KEY)\s*=\s*["']?(?!<|\$\{|your[-_]|example[-_]|replace[-_])([^\s"'#]{12,})/gm,
];
const findings = [];

for (const path of paths) {
  if (/(^|\/)\.env(?:\.[^/]*)?$/.test(path) && !/(^|\/)\.env\.example$/.test(path)) {
    findings.push(`${path}: dotenv files with real configuration must not be committed`);
    continue;
  }

  let contents;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    continue;
  }

  const lines = contents.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[index])) {
        findings.push(`${path}:${index + 1}: possible credential found (value hidden)`);
        break;
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed. Remove credentials from these files and rotate any exposed keys:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed for ${paths.length} tracked and unignored files.`);
}
