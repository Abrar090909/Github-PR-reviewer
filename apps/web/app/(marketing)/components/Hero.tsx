import Link from "next/link";
import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";
import { example } from "@/lib/showcase";
import ContourLogo from "../../components/ContourLogo";
import GitHubMark from "../../components/GitHubMark";
import DiagramTabs from "./DiagramTabs";

export default function Hero() {
  const stats = example.stats;

  return (
    <section className="px-4 pb-16 pt-28 sm:px-6 md:pb-24 md:pt-36">
      <div className="mx-auto max-w-6xl">
        <h1 className="max-w-[1000px] text-[40px] font-medium leading-[1.05] tracking-[-0.03em] md:text-[64px]">
          See what a pull request touches before you read the diff
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-[1.6] text-fg-2 md:text-xl">
          Contour draws each pull request as an architecture and data-flow diagram, reviews the change, and posts both
          as one comment on the PR, updated on every push
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary h-12">
            <GitHubMark />
            Add to GitHub
          </a>
          <Link href="/r/example#walkthrough" className="btn-secondary h-12">
            Try the interactive map
          </Link>
        </div>
        <p className="mt-5 text-sm text-fg-2">Free for public repositories · no workflow file or API key · read-only access to code</p>

        {/* A PR comment as Contour posts it. The diagram is real renderer output. */}
        <figure className="mt-14 overflow-hidden rounded-2xl border border-fg/15 bg-ink-850 shadow-[0_24px_64px_rgb(var(--shadow))] md:mt-20">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-ink-800 px-4 py-3 text-sm sm:px-6">
            <ContourLogo size={20} />
            <span className="font-medium">contour</span>
            <span className="rounded-full border border-line px-2 font-mono text-xs text-fg-3">bot</span>
            <span className="text-fg-3">commented on an example pull request</span>
            {stats && (
              <span className="ml-auto font-mono text-xs tabular-nums text-fg-2">
                {stats.filesChanged} files <span className="text-added">+{stats.additions}</span>{" "}
                <span className="text-removed">−{stats.deletions}</span>
              </span>
            )}
          </div>
          <figcaption className="px-4 pb-4 pt-5 sm:px-6">
            <p className="text-[17px] font-medium">{example.title}</p>
            <p className="mt-1 max-w-3xl text-[15px] leading-6 text-fg-2">{example.summary}</p>
          </figcaption>
          <DiagramTabs
            tabs={[
              { label: "Architecture", diagram: example.focused, href: "/r/example#view=new-batch-path" },
              { label: "Data flow", diagram: example.dataFlow, href: "/r/example#data-flow" },
            ]}
          />
          <details className="border-t border-line px-4 py-3 text-sm sm:px-6">
            <summary className="cursor-pointer text-fg-2 hover:text-fg">The diagram as text</summary>
            <div className="mt-3 grid gap-6 pb-2 md:grid-cols-2">
              <ul className="space-y-1 text-fg-2">
                {example.parts.map((part) => (
                  <li key={part.label}>
                    <span className="text-fg">{part.label}</span> — {part.delta}, in {part.lane}
                  </li>
                ))}
              </ul>
              <ul className="space-y-1 text-fg-2">
                {example.connections.map((edge, index) => (
                  <li key={index}>
                    {edge.from} → {edge.to}
                    {edge.label ? <span className="text-fg-3"> ({edge.label})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </figure>
      </div>
    </section>
  );
}
