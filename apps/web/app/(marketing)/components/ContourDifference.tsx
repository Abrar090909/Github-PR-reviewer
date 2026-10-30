const FEATURES = [
  {
    title: "Two views of one change",
    meta: "architecture · data flow",
    body: "The architecture view places each part in the lane it runs in and draws the one connection the change is about as the hero edge. The data-flow view plays the calls in order, so an async trigger or a new batch step is visible at a glance.",
  },
  {
    title: "Every part traces back to the diff",
    meta: "contour explain <id>",
    body: "Nodes and edges carry the file and line range that motivated them, checked against the real diff hunks. A reviewer can ask why a box exists and land on the code.",
  },
  {
    title: "A walkthrough in change order",
    meta: "2 to 12 steps",
    body: "A short guided tour that names each change in plain words: what was added, what was removed, what happens now that did not before.",
  },
  {
    title: "Corrections that stay corrected",
    meta: ".github/contour.yml",
    body: "Rename a node, hide test files or pin a folder to a lane once. The overlay is applied on every run, and Contour reports when a rule stops matching anything.",
  },
];

const COMPARISON = [
  ["What changed in each file", "Yes", "Linked from every part"],
  ["How the changed parts connect", "—", "Architecture view"],
  ["The order calls happen in", "—", "Data-flow view"],
  ["Untouched code the change depends on", "—", "Shown, marked unchanged"],
  ["Setup", "Built in", "Install the App, no workflow or key"],
];

export default function ContourDifference() {
  return (
    <section id="features" className="section">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">What you get</p>
        <h2 className="heading max-w-2xl">A diagram you can check, not a summary you have to trust</h2>

        <div className="mt-12 divide-y divide-line border-y border-line">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="grid gap-3 py-8 md:grid-cols-[320px_1fr] md:gap-12">
              <div>
                <h3 className="text-[17px] font-medium">{feature.title}</h3>
                <p className="mt-1 font-mono text-[13px] text-fg-3">{feature.meta}</p>
              </div>
              <p className="max-w-2xl text-[15px] leading-7 text-fg-2">{feature.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-fg-3">
                <th scope="col" className="py-3 pr-6 font-normal">In the review</th>
                <th scope="col" className="py-3 pr-6 font-normal">GitHub diff</th>
                <th scope="col" className="py-3 font-normal text-fg">With Contour</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([row, diff, contour]) => (
                <tr key={row} className="border-b border-line">
                  <th scope="row" className="py-3 pr-6 font-normal text-fg-2">{row}</th>
                  <td className="py-3 pr-6 text-fg-3">{diff}</td>
                  <td className="py-3">{contour}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
