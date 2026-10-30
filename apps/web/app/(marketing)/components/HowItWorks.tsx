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
    body: "A model reads the diff and writes a graph document. It is rejected unless it validates against the schema, and commit SHAs and line counts come from Git, not the model.",
  },
  {
    title: "One comment, kept current",
    body: "Light and dark diagrams are rendered and posted as a single comment, which is edited in place on later pushes.",
  },
];

const FACTS = [
  ["Stored", "The graph document and rendered diagrams, not the diff"],
  ["Deleted", "Analyses and diagrams for a repository when you remove it or uninstall"],
  ["Runs", "On Contour's worker, outside your CI jobs"],
  ["Images", "Content-addressed, so GitHub's image cache never shows an old diagram"],
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_400px] md:gap-20">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="heading">From install to diagram in four steps</h2>

          <ol className="mt-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[32px_1fr] gap-4 pb-8 last:pb-0">
                <span className="relative flex flex-col items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-800 font-mono text-[13px] tabular-nums text-fg-2">
                    {index + 1}
                  </span>
                  {index < STEPS.length - 1 && <span className="mt-2 w-px flex-1 bg-line" />}
                </span>
                <span className="pt-1">
                  <span className="block text-[17px] font-medium">{step.title}</span>
                  <span className="mt-2 block text-[15px] leading-7 text-fg-2">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="self-start rounded-2xl border border-line bg-ink-850 p-6 md:mt-12">
          <p className="mb-2 text-sm font-medium">What happens to your code</p>
          <dl className="divide-y divide-line">
            {FACTS.map(([term, detail]) => (
              <div key={term} className="grid grid-cols-[72px_1fr] gap-3 py-4">
                <dt className="font-mono text-[13px] text-fg-3">{term}</dt>
                <dd className="text-sm leading-6 text-fg-2">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
