"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Crosshair, FileCode2 } from "lucide-react";
import ContourLogo from "../../components/ContourLogo";

/*
 * The features section as one bento grid (hero and strip). Written before any tile was built:
 *
 *   Tile         Span   Kind        The one thing                                  Moves, once, on scroll-in
 *   Review       2 × 1  Hero UI     Contour's real inline finding on worker.mjs     Commit suggestion presses; line 9 gains `await`
 *   PR #4        1 × 1  Stat        22 files, on the one green tile                 counts up
 *   Walkthrough  1 × 1  Component   the map's walkthrough card                       Next presses; step 1 becomes step 2
 *   Grounded     1 × 1  Statement   findings outside the diff are dropped            holds still
 *   Two views    1 × 1  Diagram     parts in lanes, marked new, changed, removed     edges draw; one dot rides the main call
 *
 * One piece of file chrome in the grid (the hero's). Neighbours differ across and down, no real string
 * appears in two tiles, and each tile plays its one beat 110 ms after the one before it in reading order.
 */

const LEAD = 450;
const STEP = 110;

/** True once the element has scrolled into view, then for good. */
function useOnce<T extends Element>(order: number) {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        timer = setTimeout(() => setOn(true), LEAD + order * STEP);
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [order]);
  return [ref, on] as const;
}

function Tile({ className = "", copy, children, tone }: { className?: string; copy?: ReactNode; children: ReactNode; tone?: "accent" }) {
  return (
    <div
      className={`relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border ${
        tone === "accent" ? "border-transparent bg-accent text-[rgb(var(--on-accent))]" : "border-line bg-ink-850"
      } ${className}`}
    >
      {copy && <p className="px-6 pt-6 text-[17px] leading-[1.5] text-fg-2 [&_b]:font-medium [&_b]:text-fg">{copy}</p>}
      {children}
    </div>
  );
}

/* ---------- Review (hero) ---------- */

// worker.mjs lines 8 to 11, at their real indentation (inside drainQueue's while loop).
const LINES: { n: number; code: ReactNode }[] = [
  { n: 8, code: <>{"    "}<span className="text-[rgb(var(--syn-key))]">try</span> {"{"}</> },
  { n: 9, code: null },
  { n: 10, code: <>{"      "}delivered <span className="text-[rgb(var(--syn-key))]">+=</span> <span className="text-[rgb(var(--syn-num))]">1</span>;</> },
  { n: 11, code: <>{"    "}{"}"} <span className="text-[rgb(var(--syn-key))]">catch</span> (error) {"{"}</> },
];

function ReviewPicture() {
  const [ref, on] = useOnce<HTMLDivElement>(0);
  return (
    <div ref={ref} className="relative mt-6 min-h-[340px] flex-1 pl-6" aria-hidden="true">
      <div className="absolute inset-y-0 left-6 right-[-48px] rounded-tl-xl border-l border-t border-line bg-ink-950 font-mono text-[13px] [--code:rgb(var(--fg))]">
        <div className="flex items-center gap-2 whitespace-nowrap border-b border-line px-4 py-2.5 text-fg-2">
          <FileCode2 size={14} strokeWidth={1.5} className="shrink-0" />
          <span>examples/contour-retry-test/worker.mjs</span>
          <span className="text-added">+18</span>
        </div>
        <div className="py-1.5">
          {LINES.map(({ n, code }) => (
            <div
              key={n}
              className={`grid h-[26px] grid-cols-[44px_1fr] items-center whitespace-pre ${
                "bg-added/10"
              } ${n === 9 && on ? "bento-flash" : ""}`}
            >
              <span className="border-l-2 border-accent pr-3 text-right tabular-nums text-fg-2">{n}</span>
              <span className="text-fg">
                {n === 9 ? (
                  <>
                    {"      "}
                    <span className="bento-await" data-on={on || undefined}><span className="text-[rgb(var(--syn-key))]">await</span>{" "}</span>
                    <span className="text-[rgb(var(--syn-fn))]">handleEvent</span>(event);
                  </>
                ) : (
                  code
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Contour's inline comment, word for word from its review of this diff. */}
        <div className="mx-4 mb-6 mt-1 max-w-[560px] rounded-xl border border-line bg-ink-850 font-sans">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2 text-[13px]">
            <ContourLogo size={16} />
            <span className="font-medium text-fg">contour</span>
            <span className="rounded-full border border-line px-1.5 font-mono text-[11px] leading-4 text-fg-3">bot</span>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-[14px] leading-[1.45] text-fg">
              <span className="font-medium text-removed">High · correctness</span> — Missing{" "}
              <code className="rounded bg-fg/10 px-1 font-mono text-[12px]">await</code> on{" "}
              <code className="rounded bg-fg/10 px-1 font-mono text-[12px]">handleEvent</code> ignores asynchronous failures
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="bento-commit inline-flex h-8 items-center overflow-hidden rounded-lg bg-accent px-3 text-[13px] font-medium text-[rgb(var(--on-accent))]" data-on={on || undefined}>
                <span className="bento-commit-label">
                  <span>Commit suggestion</span>
                  <span className="inline-flex items-center gap-1.5"><Check size={14} strokeWidth={2} />Committed</span>
                </span>
              </span>
              <span className="text-[13px] text-fg-3">see it on the map</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- PR #4 (stat) ---------- */

function StatTile() {
  const [ref, on] = useOnce<HTMLDivElement>(1);
  const [n, setN] = useState(22);
  useEffect(() => {
    if (!on || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 800);
      setN(Math.round(22 * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setN(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on]);
  return (
    <Tile tone="accent">
      <div ref={ref} className="flex flex-1 flex-col justify-between p-6">
        <div>
          <p className="text-[17px] leading-[1.5]">Contour&apos;s own pull request #4 touched</p>
          <p className="mt-2 whitespace-nowrap text-[148px] font-medium leading-[0.9] tracking-[-0.05em] tabular-nums">
            {n}<span className="ml-2 text-[36px] tracking-[-0.02em]">files</span>
          </p>
        </div>
        <div>
          {/* One mark per file in PR #4: 12 new (solid), 10 changed (outlined), filling in as the count runs. */}
          <div className="grid grid-cols-11 gap-1.5" aria-hidden="true">
            {Array.from({ length: 22 }, (_, index) => (
              <span
                key={index}
                className={`aspect-square rounded-[4px] border-2 border-current transition-opacity duration-200 ${index < 12 ? "bg-current" : ""} ${index < n ? "opacity-100" : "opacity-20"}`}
              />
            ))}
          </div>
          <p className="mt-4 text-[17px] leading-[1.5]">12 new, 10 changed, and one diagram on the pull request showing how they connect.</p>
        </div>
      </div>
    </Tile>
  );
}

/* ---------- Walkthrough (component) ---------- */

type Steps = { total: number; first: string; second: string };

function WalkthroughPicture({ total, first, second }: Steps) {
  const [ref, on] = useOnce<HTMLDivElement>(2);
  return (
    <div ref={ref} className="mt-6 flex flex-1 items-start px-6 pb-6" aria-hidden="true">
      <div className="w-full rounded-2xl border border-line bg-ink-900 p-4 shadow-[0_8px_24px_rgb(var(--shadow))]">
        <div className="mb-3 flex gap-1">
          {Array.from({ length: total }, (_, index) => (
            <span key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-fg/10">
              <span className={`block h-full rounded-full bg-accent transition-transform duration-500 ease-out ${index === 0 || (index === 1 && on) ? "translate-x-0" : "-translate-x-full"}`} />
            </span>
          ))}
        </div>
        <div className="bento-swap h-[66px] overflow-hidden" data-on={on || undefined}>
          <div className="h-[66px]">
            <p className="font-mono text-xs tabular-nums text-fg-3">Step 1 of {total}</p>
            <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-[1.4] text-fg">{first}</p>
          </div>
          <div className="h-[66px]">
            <p className="font-mono text-xs tabular-nums text-fg-3">Step 2 of {total}</p>
            <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-[1.4] text-fg">{second}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 text-fg-2"><ChevronLeft size={16} strokeWidth={1.5} /></span>
          <span className="bento-press inline-flex h-9 items-center gap-1 rounded-lg bg-accent px-4 text-[13px] font-medium text-[rgb(var(--on-accent))]" data-on={on || undefined}>
            Next <ChevronRight size={16} strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Two views (diagram) ---------- */

function DiagramPicture() {
  const [ref, on] = useOnce<HTMLDivElement>(4);
  return (
    <div ref={ref} className="mt-6 flex-1 overflow-hidden pl-6" aria-hidden="true">
      <svg viewBox="12 0 348 190" className="h-auto w-[115%] min-w-[340px] max-w-none font-mono" data-on={on || undefined}>
        {[12, 128, 244].map((x) => <rect key={x} x={x} y={8} width={104} height={182} rx={10} className="fill-fg/[0.04]" />)}
        {/* Connections draw in; the main call keeps a dot riding it. */}
        <path className="bento-edge stroke-fg-3" d="M100 56 C116 56 116 52 140 52" />
        <path className="bento-edge bento-edge-main stroke-added" d="M216 52 C236 52 236 110 256 110" style={{ ["--d" as string]: "120ms" }} />
        <path className="bento-fade stroke-removed" strokeDasharray="4 4" d="M100 66 C118 66 118 138 140 138" style={{ ["--d" as string]: "240ms" }} />
        {on && (
          <circle r="3.5" className="fill-added">
            <animateMotion dur="1.6s" repeatCount="indefinite" path="M216 52 C236 52 236 110 256 110" />
          </circle>
        )}
        <g>
          <rect x={20} y={38} width={80} height={36} rx={10} className={`fill-ink-800 stroke-fg/20`} />
          <rect x={30} y={53} width={46} height={6} rx={3} className="fill-fg/20" />
        </g>
        <g>
          <rect x={140} y={34} width={76} height={36} rx={10} className={`fill-ink-800 stroke-added/70`} />
          <rect x={150} y={49} width={38} height={6} rx={3} className="fill-fg/30" />
          <text x={178} y={30} className="fill-added text-[8.5px] font-bold tracking-[0.06em]">NEW</text>
        </g>
        <g opacity={0.7}>
          <rect x={140} y={120} width={76} height={36} rx={10} className={`fill-ink-800 stroke-removed/70 [stroke-dasharray:4_3]`} />
          <rect x={150} y={135} width={44} height={6} rx={3} className="fill-fg/20" />
          <text x={162} y={116} className="fill-removed text-[8.5px] font-bold tracking-[0.06em]">REMOVED</text>
        </g>
        <g>
          <rect x={256} y={92} width={88} height={36} rx={10} className={`fill-ink-800 stroke-modified/70`} />
          <rect x={266} y={107} width={50} height={6} rx={3} className="fill-fg/30" />
          <text x={292} y={88} className="fill-modified text-[8.5px] font-bold tracking-[0.06em]">CHANGED</text>
        </g>
      </svg>
    </div>
  );
}

/** The walkthrough tile shows the example's first two real steps, passed in from the server. */
export default function FeatureBento({ steps }: { steps: Steps }) {
  return (
    <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[440px_340px]">
      <Tile
        className="min-h-[440px] md:col-span-2"
        copy={<><b>Review on the exact lines.</b> Each finding lands inline on the diff, with a fix you can commit from the comment.</>}
      >
        <ReviewPicture />
      </Tile>
      <StatTile />
      <Tile copy={<><b>A walkthrough in change order.</b> The map moves to each step and lights the parts it is about.</>}>
        <WalkthroughPicture {...steps} />
      </Tile>
      <Tile>
        <div className="flex flex-1 flex-col justify-between p-6">
          <div>
            <Crosshair size={24} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
            <p className="mt-5 text-[34px] font-medium leading-[1.12] tracking-[-0.025em] text-fg">
              Findings outside the diff are dropped, never posted.
            </p>
          </div>
          <p className="text-[15px] leading-6 text-fg-2">Every part and finding is checked against the real hunks first.</p>
        </div>
      </Tile>
      <Tile copy={<><b>Two views of one change.</b> Parts in the lane they run in, calls in the order they happen.</>}>
        <DiagramPicture />
      </Tile>
    </div>
  );
}
