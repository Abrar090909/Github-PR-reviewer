const STATES = [
  { mark: "+", label: "Added", color: "text-added", detail: "New routes, services, functions and stores" },
  { mark: "~", label: "Modified", color: "text-modified", detail: "Parts whose code the diff changed" },
  { mark: "−", label: "Removed", color: "text-removed", detail: "Parts the change retires, drawn dashed" },
  { mark: "·", label: "Unchanged", color: "text-fg-3", detail: "Neighbours the change touches, so the blast radius is visible" },
];

export default function ProblemFraming() {
  return (
    <section className="section">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-20">
        <div>
          <p className="eyebrow">Why review is slow</p>
          <h2 className="heading">A diff shows lines. A reviewer needs the shape of the change</h2>
          <div className="mt-6 space-y-4 text-base leading-7 text-fg-2">
            <p>
              A pull request that touches fifteen files arrives as fifteen separate lists of lines. Working out which
              service calls which, and what stopped being called, happens in the reviewer&apos;s head.
            </p>
            <p>
              Contour does that part first. It reads the diff, draws the parts it touches in the lanes they run in,
              and marks every part against the base branch.
            </p>
          </div>
        </div>

        <div className="md:pt-10">
          <p className="mb-4 text-sm text-fg-2">Every part of a diagram carries one of four marks</p>
          <ul className="divide-y divide-line border-y border-line">
            {STATES.map((state) => (
              <li key={state.label} className="grid grid-cols-[24px_96px_1fr] items-baseline gap-2 py-4">
                <span className={`font-mono text-lg leading-none ${state.color}`} aria-hidden="true">
                  {state.mark}
                </span>
                <span className="text-[15px]">{state.label}</span>
                <span className="text-sm leading-6 text-fg-2">{state.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
