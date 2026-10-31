import { Check, FileSearch, ListChecks, Minus, PlayCircle, Workflow } from "lucide-react";

const FEATURES = [
  {
    icon: Workflow,
    title: "Two views of one change",
    meta: "architecture · data flow",
    body: "The architecture view places each part in the lane it runs in. The data-flow view plays the calls in order, so an async trigger or a new batch step is visible at a glance.",
  },
  {
    icon: ListChecks,
    title: "A review you can check",
    meta: "inline comments · suggestions",
    body: "Findings land on the exact lines of the diff, with severity and a fix you can commit when the fix is small and certain. Any finding that points outside the diff is dropped, not posted.",
  },
  {
    icon: PlayCircle,
    title: "A walkthrough in change order",
    meta: "3 to 6 steps",
    body: "A short guided tour that names each change in plain words. On the map, the camera moves to each step and lights up the parts it is about.",
  },
  {
    icon: FileSearch,
    title: "Every part traces back to the diff",
    meta: "click a part, land on its lines",
    body: "Parts carry the file and line range that motivated them, checked against the real diff hunks. Ask why a box exists and land on the code.",
  },
];

const COMPARISON: [string, string | false, string][] = [
  ["What changed in each file", "Yes", "Linked from every part"],
  ["How the changed parts connect", false, "Architecture view"],
  ["The order calls happen in", false, "Data-flow view"],
  ["Untouched code the change depends on", false, "Shown, marked unchanged"],
  ["Review comments on the changed lines", false, "Grounded in the diff"],
  ["Setup", "Built in", "Install the App, no workflow or key"],
];

export default function ContourDifference() {
  return (
    <section id="features" className="section">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">What you get</p>
        <h2 className="heading max-w-2xl">A diagram you can check, not a summary you have to trust</h2>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, meta, body }) => (
            <div key={title} className="rounded-2xl border border-line bg-ink-850 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                <Icon size={18} strokeWidth={1.5} />
              </span>
              <h3 className="mt-5 text-lg font-medium">{title}</h3>
              <p className="mt-1 font-mono text-[13px] text-fg-3">{meta}</p>
              <p className="mt-3 text-[15px] leading-7 text-fg-2">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[600px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-4 font-medium text-fg-2">In the review</th>
                <th scope="col" className="px-5 py-4 font-medium text-fg-2">GitHub diff</th>
                <th scope="col" className="bg-accent/10 px-5 py-4 font-medium text-fg">With Contour</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([row, diff, contour]) => (
                <tr key={row} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-5 py-4 font-normal text-fg">{row}</th>
                  <td className="px-5 py-4 text-fg-2">
                    {diff === false ? (
                      <span className="inline-flex items-center gap-2 text-fg-3">
                        <Minus size={16} strokeWidth={1.5} aria-hidden="true" /> Not shown
                      </span>
                    ) : (
                      diff
                    )}
                  </td>
                  <td className="bg-accent/10 px-5 py-4">
                    <span className="inline-flex items-center gap-2">
                      <Check size={16} strokeWidth={2} className="shrink-0 text-accent" aria-hidden="true" />
                      {contour}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
