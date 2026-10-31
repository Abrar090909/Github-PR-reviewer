"use client";

import { Fragment, useState } from "react";
import { Check, Copy, FileCode2 } from "lucide-react";
import { GITHUB_APP_INSTALL_URL, GITHUB_REPOSITORY_URL } from "@/lib/constants";
import GitHubMark from "../../components/GitHubMark";

const WORKFLOW_PATH = ".github/workflows/contour.yml";

const WORKFLOW = `on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  contour:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: Abrar090909/Github-PR-reviewer/packages/action@master
        with:
          api-key: \${{ secrets.GEMINI_API_KEY }}`;

// The hosted App's permissions, as declared in infra/github-app-manifest.yml.
const ACCESS = [
  { scope: "Code", level: "Read", why: "to read the diff of a pull request" },
  { scope: "Metadata", level: "Read", why: "to know which repositories you selected" },
  { scope: "Pull requests", level: "Read and write", why: "to post the comment and review" },
];

const KEPT = [
  ["Stored", "The graph document, the review and the rendered diagrams. Never the diff."],
  ["Deleted", "Everything for a repository when you remove it or uninstall."],
];

/** Light YAML colouring: keys, values, and the secret expression. */
function YamlLine({ line }: { line: string }) {
  const match = /^(\s*(?:-\s+)?)([\w.-]+)(:)(.*)$/.exec(line);
  if (!match) return <>{line}</>;
  const [, indent, key, colon, rest] = match;
  const value = rest!.split(/(\$\{\{[^}]*\}\})/).map((part, index) =>
    part.startsWith("${{") ? (
      <span key={index} className="text-modified">{part}</span>
    ) : (
      <span key={index} className="text-[#a5d6ff]">{part}</span>
    ),
  );
  return (
    <>
      {indent}
      <span className="text-[#7ee2b8]">{key}</span>
      <span className="text-fg-3">{colon}</span>
      {value}
    </>
  );
}

export default function InstallSection() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(WORKFLOW);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the snippet stays selectable.
    }
  }

  return (
    <section id="install" className="section">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Install</p>
        <h2 className="heading">Install once, and every pull request gets a diagram</h2>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col rounded-2xl border border-accent/40 bg-ink-850 p-6">
            <h3 className="text-lg font-medium">GitHub App</h3>
            <p className="mt-1 font-mono text-[13px] text-accent">hosted · recommended</p>
            <p className="mt-4 text-[15px] leading-7 text-fg-2">
              Choose the repositories and you are done. Contour runs the model, renders the diagrams and keeps the
              comment current. No workflow file and no model key.
            </p>

            <p className="mt-6 text-sm font-medium">What it can access</p>
            <dl className="mt-2 divide-y divide-line rounded-xl border border-line text-sm">
              {ACCESS.map((item) => (
                <div key={item.scope} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2.5">
                  <dt className="text-fg">{item.scope}</dt>
                  <dd className="font-mono text-xs text-fg-2">{item.level}</dd>
                  <dd className="col-span-2 text-[13px] text-fg-3">{item.why}</dd>
                </div>
              ))}
            </dl>
            <dl className="mt-4 space-y-2 text-[13px] leading-5">
              {KEPT.map(([term, detail]) => (
                <div key={term} className="grid grid-cols-[64px_1fr] gap-2">
                  <dt className="font-mono text-fg-3">{term}</dt>
                  <dd className="text-fg-2">{detail}</dd>
                </div>
              ))}
            </dl>

            <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 self-start">
              <GitHubMark />
              Add to GitHub
            </a>
          </div>

          <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-ink-850 p-6">
            <h3 className="text-lg font-medium">GitHub Action</h3>
            <p className="mt-1 font-mono text-[13px] text-fg-3">self-hosted · your own model key</p>
            <p className="mt-4 text-[15px] leading-7 text-fg-2">
              Commit this workflow and add a <code className="font-mono text-[13px] text-fg">GEMINI_API_KEY</code>{" "}
              secret. OpenAI and any /chat/completions endpoint work too, see the{" "}
              <a href={`${GITHUB_REPOSITORY_URL}/blob/master/packages/action/README.txt`} className="text-link">
                Action reference
              </a>
              .
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-line bg-ink-950">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
                <span className="inline-flex min-w-0 items-center gap-2 font-mono text-[13px] text-fg-2">
                  <FileCode2 size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{WORKFLOW_PATH}</span>
                </span>
                <button type="button" onClick={copy} aria-label="Copy the workflow"
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-fg-2 transition-colors duration-150 hover:bg-ink-700 hover:text-fg">
                  {copied ? <Check size={14} strokeWidth={1.5} className="text-accent" /> : <Copy size={14} strokeWidth={1.5} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-fg">
                {WORKFLOW.split("\n").map((line, index) => (
                  <Fragment key={index}>
                    <YamlLine line={line} />
                    {"\n"}
                  </Fragment>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
