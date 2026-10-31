import Link from "next/link";
import { FileCode2 } from "lucide-react";
import { example } from "@/lib/showcase";
import ThemedDiagram from "../../components/ThemedDiagram";

const STATES = [
  { chip: "chip-added", label: "NEW", detail: "Routes, services, functions and stores the pull request adds" },
  { chip: "chip-modified", label: "CHANGED", detail: "Parts whose code the diff touches" },
  { chip: "chip-removed", label: "REMOVED", detail: "Parts the change retires, drawn dashed" },
  { chip: "chip-unchanged", label: "UNCHANGED", detail: "Neighbours the change relies on, so the blast radius is visible" },
];

const FILE_MARK = { added: "text-added", modified: "text-modified", removed: "text-removed", unchanged: "text-fg-3" } as const;

export default function ProblemFraming() {
  const shown = example.files.slice(0, 9);
  const more = Math.max(0, (example.stats?.filesChanged ?? shown.length) - shown.length);

  return (
    <section className="section">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Why review is slow</p>
        <h2 className="heading max-w-3xl">A diff shows lines. A reviewer needs the shape of the change</h2>
        <p className="lede">
          A pull request that touches fourteen files arrives as fourteen separate lists of lines. Working out which
          service calls which, and what stopped being called, happens in the reviewer&apos;s head. Contour does that
          part first.
        </p>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-stretch gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col rounded-2xl border border-line bg-ink-850 p-5">
            <p className="text-sm font-medium">What GitHub shows</p>
            <p className="mt-1 text-sm text-fg-2">{example.stats?.filesChanged} files, in alphabetical order</p>
            <ul className="mt-4 flex-1 divide-y divide-line rounded-xl border border-line bg-ink-950 font-mono text-[13px]">
              {[...shown].sort((a, b) => a.path.localeCompare(b.path)).map((file) => (
                <li key={file.path} className="flex items-center gap-2 px-3 py-2">
                  <FileCode2 size={14} strokeWidth={1.5} className={`shrink-0 ${FILE_MARK[file.delta]}`} aria-hidden="true" />
                  <span className="truncate text-fg-2">{file.path}</span>
                </li>
              ))}
              {more > 0 && <li className="px-3 py-2 text-fg-3">and {more} more files</li>}
            </ul>
          </div>

          <div className="flex flex-col rounded-2xl border border-accent/40 bg-ink-850 p-5">
            <p className="text-sm font-medium">What Contour shows</p>
            <p className="mt-1 text-sm text-fg-2">The same change, in the lanes it runs in, marked against the base branch</p>
            <Link href="/r/example#architecture" className="mt-4 block flex-1 overflow-hidden rounded-xl border border-line bg-canvas">
              <ThemedDiagram
                src={example.architecture.src}
                srcLight={example.architecture.srcLight}
                width={example.architecture.width}
                height={example.architecture.height}
                alt={`${example.architecture.alt}. Open it on the interactive map`}
                className="h-auto w-full"
              />
            </Link>
          </div>
        </div>

        <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-4 sm:grid-cols-2">
          {STATES.map((state) => (
            <li key={state.label} className="flex items-start gap-3">
              <span className={`${state.chip} mt-0.5 w-[92px] shrink-0 justify-center`}>{state.label}</span>
              <span className="text-[15px] leading-6 text-fg-2">{state.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
