import Link from "next/link";
import { postmarkRefactorGraph } from "@contour/schema/examples";
import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";
import { readFirst } from "@/lib/hosted/focus";
import { example } from "@/lib/showcase";
import ContourLogo from "../../components/ContourLogo";
import GitHubMark from "../../components/GitHubMark";
import ThemedDiagram from "../../components/ThemedDiagram";

const STEPS = [
  {
    title: "Install the GitHub App",
    body: "Pick the repositories Contour may read. There is no workflow to commit and no model key to set up.",
  },
  {
    title: "Open or update a pull request",
    body: "Each opened, reopened or pushed pull request queues one analysis, using a short-lived installation token.",
  },
  {
    title: "Contour drafts and checks the graph",
    body: "A model reads the diff and writes a graph document and a review. Both are checked against the diff, and commit SHAs and line counts come from Git, not the model.",
  },
  {
    title: "One comment, kept current",
    body: "The diagrams, walkthrough and review summary land in a single comment, with findings inline on the diff. Later pushes edit the same comment.",
  },
];

export default function HowItWorks() {
  const stats = example.stats;
  const focus = readFirst(postmarkRefactorGraph, [], 3);

  return (
    <section id="how-it-works" className="section">
      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="heading">From install to diagram in four steps</h2>

          <ol className="mt-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[36px_1fr] gap-4 pb-8 last:pb-0">
                <span className="relative flex flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 font-mono text-sm tabular-nums text-accent">
                    {index + 1}
                  </span>
                  {index < STEPS.length - 1 && <span className="mt-2 w-px flex-1 bg-line" />}
                </span>
                <span className="pt-1">
                  <span className="block text-lg font-medium">{step.title}</span>
                  <span className="mt-2 block text-[15px] leading-7 text-fg-2">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-10">
            <GitHubMark />
            Add to GitHub
          </a>
        </div>

        {/* What step four looks like on the pull request, from the example's real output. */}
        <figure className="self-start lg:sticky lg:top-24">
          <figcaption className="mb-3 text-sm text-fg-2">What lands on the pull request</figcaption>
          <div className="overflow-hidden rounded-2xl border border-fg/15 bg-ink-850 text-sm shadow-[0_16px_48px_rgb(var(--shadow))]">
            <div className="flex items-center gap-2 border-b border-line bg-ink-800 px-4 py-3">
              <ContourLogo size={18} />
              <span className="font-medium">contour</span>
              <span className="rounded-full border border-line px-2 font-mono text-xs text-fg-3">bot</span>
              <span className="text-fg-3">commented</span>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-base font-medium">{example.title}</p>
                <p className="mt-2 flex flex-wrap gap-1.5 font-mono text-xs">
                  <span className="rounded-md bg-fg/10 px-1.5 py-0.5">{stats?.filesChanged} files</span>
                  <span className="rounded-md bg-fg/10 px-1.5 py-0.5 text-added">+{stats?.additions}</span>
                  <span className="rounded-md bg-fg/10 px-1.5 py-0.5 text-removed">−{stats?.deletions}</span>
                </p>
              </div>
              <Link href="/r/example#architecture" className="block overflow-hidden rounded-lg border border-line bg-canvas">
                <ThemedDiagram
                  src={example.architecture.src}
                  srcLight={example.architecture.srcLight}
                  width={example.architecture.width}
                  height={example.architecture.height}
                  alt={`${example.architecture.alt}, as it appears in the comment`}
                  className="h-auto w-full"
                />
              </Link>
              <p className="text-center">
                <Link href="/r/example#walkthrough" className="text-link font-medium">▶ Play the walkthrough</Link>
                <span className="text-fg-3"> · </span>
                <Link href="/r/example" className="text-link">Open the interactive map</Link>
              </p>
              <div className="rounded-lg border border-line p-3">
                <p className="font-medium">Walkthrough · {example.steps.length} steps</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-2">
                  {example.steps.slice(0, 3).map((step) => <li key={step.id}>{step.heading}</li>)}
                </ol>
              </div>
              <div className="rounded-lg border border-line p-3">
                <p className="font-medium">Read these files first</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {focus.map((file) => (
                    <li key={file.path} className="break-all font-mono text-xs text-fg-2">{file.path}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
