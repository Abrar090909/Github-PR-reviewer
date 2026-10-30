"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { GITHUB_APP_INSTALL_URL, GITHUB_REPOSITORY_URL } from "@/lib/constants";
import GitHubMark from "../../components/GitHubMark";

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

        <div className="mt-12 grid gap-4 md:grid-cols-[2fr_3fr]">
          <div className="flex flex-col rounded-2xl border border-line bg-ink-850 p-6">
            <h3 className="text-[17px] font-medium">GitHub App</h3>
            <p className="mt-1 font-mono text-[13px] text-fg-3">hosted · recommended</p>
            <p className="mt-4 flex-1 text-[15px] leading-7 text-fg-2">
              Choose the repositories and you are done. Contour runs the model, renders the diagrams and keeps the
              comment current. No workflow file and no model key.
            </p>
            <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 self-start">
              <GitHubMark />
              Add to GitHub
            </a>
          </div>

          <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-ink-850 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-medium">GitHub Action</h3>
                <p className="mt-1 font-mono text-[13px] text-fg-3">self-hosted · your own model key</p>
              </div>
              <button type="button" onClick={copy} className="btn-secondary h-9 shrink-0 px-3 text-[13px]">
                {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-4 text-[15px] leading-7 text-fg-2">
              Add this to <code className="font-mono text-[13px] text-fg">.github/workflows/contour.yml</code> and a{" "}
              <code className="font-mono text-[13px] text-fg">GEMINI_API_KEY</code> secret. OpenAI and any
              /chat/completions endpoint work too, see the{" "}
              <a href={`${GITHUB_REPOSITORY_URL}/blob/master/packages/action/README.txt`} className="text-accent hover:underline">
                Action reference
              </a>
              .
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-ink-950 p-4 font-mono text-[13px] leading-6 text-fg-2">
              {WORKFLOW}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
