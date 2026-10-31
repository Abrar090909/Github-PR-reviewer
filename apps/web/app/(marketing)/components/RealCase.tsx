import { ExternalLink } from "lucide-react";
import { GITHUB_REPOSITORY_URL } from "@/lib/constants";
import ThemedDiagram from "../../components/ThemedDiagram";

// Contour's own diagram of its own pull request, as published by the Action on
// this repository. Checked into public/cases so the page never depends on it
// being fetchable at build time.
const CASE = {
  number: 4,
  title: "Code review, interactive review map, richer PR comment",
  files: 22,
  additions: 1827,
  deletions: 104,
  image: {
    src: "/cases/contour-pr-4-architecture.svg",
    srcLight: "/cases/contour-pr-4-architecture-light.svg",
    width: 1390,
    height: 596,
  },
  comment: `${GITHUB_REPOSITORY_URL}/pull/4#issuecomment-6536943489`,
};

export default function RealCase() {
  return (
    <section className="section bg-ink-950">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="eyebrow">A real pull request</p>
            <h2 className="heading max-w-2xl">Contour, drawing its own change</h2>
            <p className="lede">
              This is the diagram Contour posted on its own pull request #{CASE.number}, the change that added code review
              and the interactive map. Every lane, part and connection came from reading that diff.
            </p>
          </div>
          <dl className="flex gap-6 font-mono text-sm tabular-nums md:flex-col md:gap-2 md:text-right">
            <div><dt className="sr-only">Files</dt><dd className="text-fg">{CASE.files} files</dd></div>
            <div><dt className="sr-only">Lines added</dt><dd className="text-added">+{CASE.additions.toLocaleString("en-US")}</dd></div>
            <div><dt className="sr-only">Lines removed</dt><dd className="text-removed">−{CASE.deletions}</dd></div>
          </dl>
        </div>

        <a
          href={CASE.comment}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-10 block overflow-hidden rounded-2xl border border-fg/15 bg-canvas shadow-[0_24px_64px_rgb(var(--shadow))]"
        >
          <div className="overflow-x-auto">
            <ThemedDiagram
              src={CASE.image.src}
              srcLight={CASE.image.srcLight}
              width={CASE.image.width}
              height={CASE.image.height}
              alt={`Architecture of pull request ${CASE.number}: the map viewer, review engine and graph analysis in Next.js, connected to Supabase and the Gemini API`}
              className="h-auto w-full min-w-[720px]"
            />
          </div>
          <span className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
            <span className="text-fg-2">{CASE.title}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-accent group-hover:underline">
              See the comment on GitHub <ExternalLink size={14} strokeWidth={1.5} />
            </span>
          </span>
        </a>
      </div>
    </section>
  );
}
