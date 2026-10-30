import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";
import { example } from "@/lib/showcase";
import ContourLogo from "../../components/ContourLogo";
import GitHubMark from "../../components/GitHubMark";
import DiagramTabs from "./DiagramTabs";

export default function Hero() {
  const stats = example.stats;

  return (
    <section className="px-4 pb-20 pt-28 sm:px-6 md:pb-28 md:pt-40">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="max-w-[1000px] text-[40px] font-medium leading-[1.05] tracking-[-0.03em] md:text-[64px]">
            See what a pull request touches before you read the diff
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-[1.6] text-fg-2 md:text-xl">
            Contour draws each pull request as an architecture and data-flow diagram and posts it as one comment on
            the PR, updated on every push
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary h-12">
              <GitHubMark />
              Add to GitHub
            </a>
            <a href="#live-example" className="btn-secondary h-12">
              Walk through an example
            </a>
          </div>
        </div>

        {/* A PR comment as Contour posts it. The diagram is real renderer output. */}
        <figure className="mt-16 overflow-hidden rounded-2xl border border-line bg-ink-900 md:mt-20">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-ink-800 px-4 py-3 text-sm sm:px-6">
            <ContourLogo size={20} />
            <span className="font-medium">contour</span>
            <span className="rounded-full border border-line px-2 font-mono text-xs text-fg-3">bot</span>
            {example.pullRequest && <span className="text-fg-3">commented on #{example.pullRequest.number}</span>}
            {stats && (
              <span className="ml-auto font-mono text-xs tabular-nums text-fg-3">
                {stats.filesChanged} files <span className="text-added">+{stats.additions}</span>{" "}
                <span className="text-removed">−{stats.deletions}</span>
              </span>
            )}
          </div>
          <figcaption className="px-4 pt-5 sm:px-6">
            <p className="font-medium">{example.title}</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-fg-2">{example.summary}</p>
          </figcaption>
          <div className="mt-4">
            <DiagramTabs
              tabs={[
                { label: "Architecture", diagram: example.architecture },
                { label: "Data flow", diagram: example.dataFlow },
              ]}
            />
          </div>
        </figure>
      </div>
    </section>
  );
}
