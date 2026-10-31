"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Maximize,
  Minus,
  Moon,
  PanelRight,
  Play,
  Plus,
  Sun,
  X,
} from "lucide-react";
import type { Box } from "@contour/renderer";
import type { MapModel, Part } from "@/lib/hosted/map";
import type { Finding } from "@/lib/hosted/review";
import { playClick } from "@/lib/click-sound";
import ContourLogo from "../../components/ContourLogo";
import { THEME_KEY } from "../../components/ThemeToggle";

type Camera = { x: number; y: number; k: number };
type Tab = "overview" | "review" | "part";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DELTA_COLOR: Record<string, string> = {
  added: "text-added",
  modified: "text-modified",
  removed: "text-removed",
  unchanged: "text-fg-3",
};
const SEVERITY_COLOR: Record<Finding["severity"], string> = {
  high: "text-removed",
  medium: "text-modified",
  low: "text-fg-2",
};
const SEVERITY_LABEL: Record<Finding["severity"], string> = { high: "High", medium: "Medium", low: "Low" };

const unionBox = (boxes: Box[]): Box | undefined => {
  if (boxes.length === 0) return undefined;
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
  };
};

/** Boxes that touch or overlap become one, so neighbours get a single rim instead of a double line. */
const mergeBoxes = (boxes: Box[], gap = 24): Box[] => {
  const merged: Box[] = [];
  for (const box of boxes) {
    let current = box;
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      const other = merged[index]!;
      const apart =
        current.x > other.x + other.width + gap || other.x > current.x + current.width + gap ||
        current.y > other.y + other.height + gap || other.y > current.y + current.height + gap;
      if (!apart) {
        current = unionBox([current, other])!;
        merged.splice(index, 1);
      }
    }
    merged.push(current);
  }
  return merged;
};

const isNarrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

export default function Viewer({ model }: { model: MapModel }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, k: 1 });
  const [gliding, setGliding] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeFinding, setActiveFinding] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  /** Where "Back" returns to after following a part into another diagram. */
  const [trail, setTrail] = useState<{ stage: number; selected: string | null }[]>([]);
  const [hinted, setHinted] = useState(false);

  const viewport = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<number | null>(null);

  const stage = model.stages[stageIndex];
  const walking = step !== null ? model.steps[step] : undefined;

  // Read at call time, so a fit scheduled before a state change cannot use stale values.
  const live = useRef({ stage, stageIndex, step, selected });
  live.current = { stage, stageIndex, step, selected };
  /** A box to frame once the next stage is on screen; undefined when nothing is waiting. */
  const pendingFrame = useRef<Box | undefined>(undefined);

  /* ── Camera ─────────────────────────────────────────────────────────── */

  const frame = useCallback((box: Box | undefined, glide = true) => {
    const element = viewport.current;
    const current = live.current.stage;
    const target = box ?? (current ? { x: 0, y: 0, width: current.width, height: current.height } : undefined);
    if (!element || !target) return;
    const { width, height } = element.getBoundingClientRect();
    // The walkthrough card covers the bottom of the canvas, so frame above it.
    const bottom = live.current.step !== null ? Math.min(220, height * 0.35) : 0;
    const pad = Math.min(72, Math.min(width, height) * 0.1);
    const k = clamp(
      Math.min((width - pad * 2) / target.width, (height - bottom - pad * 2) / target.height),
      MIN_ZOOM,
      box ? 1.6 : 1.2,
    );
    setGliding(glide);
    setCamera({ k, x: width / 2 - (target.x + target.width / 2) * k, y: (height - bottom) / 2 - (target.y + target.height / 2) * k });
  }, []);

  /** Shows a stage and frames a box on it, now or as soon as that stage is drawn. */
  const show = useCallback((index: number, box: Box | undefined) => {
    if (index === live.current.stageIndex) {
      frame(box);
      return;
    }
    pendingFrame.current = box ?? { x: 0, y: 0, width: model.stages[index]!.width, height: model.stages[index]!.height };
    setStageIndex(index);
  }, [frame, model.stages]);

  const zoomBy = useCallback((factor: number, at?: { x: number; y: number }) => {
    const element = viewport.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const cx = at?.x ?? rect.width / 2;
    const cy = at?.y ?? rect.height / 2;
    setGliding(at === undefined);
    setCamera((current) => {
      const k = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM);
      return { k, x: cx - (cx - current.x) * (k / current.k), y: cy - (cy - current.y) * (k / current.k) };
    });
  }, []);

  // A new stage is framed on what was asked for, or fitted whole.
  useLayoutEffect(() => {
    const box = pendingFrame.current;
    pendingFrame.current = undefined;
    frame(box, box !== undefined);
  }, [stageIndex, frame]);

  // On resize, refit only when the reader is not looking at something in particular.
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (live.current.step === null && live.current.selected === null) frame(undefined, false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [frame]);

  /* ── Walkthrough ────────────────────────────────────────────────────── */

  const goToStep = useCallback((index: number) => {
    const target = model.steps[index];
    if (!target) return;
    live.current.step = index;
    setStep(index);
    setSelected(null);
    // On a phone the panel would cover the step card.
    if (isNarrow()) setPanelOpen(false);
    show(target.stage, unionBox(target.boxes));
  }, [model.steps, show]);

  const stopWalkthrough = useCallback(() => {
    live.current.step = null;
    setStep(null);
    frame(undefined);
  }, [frame]);

  /* ── Selection ──────────────────────────────────────────────────────── */

  /** Selects a part and frames it with everything it connects to on that stage. */
  const selectPart = useCallback((id: string, stageOverride?: number) => {
    const onStage = live.current.stage?.parts.some((part) => part.id === id);
    const index = stageOverride ?? (onStage
      ? live.current.stageIndex
      : model.stages.findIndex((candidate) => candidate.parts.some((part) => part.id === id)));
    const target = model.stages[index];
    const box = target?.parts.find((part) => part.id === id)?.box;
    if (!target || !box) return;
    live.current.step = null;
    live.current.selected = id;
    setStep(null);
    setSelected(id);
    setHinted(true);
    setTab("part");
    if (!isNarrow()) setPanelOpen(true);
    const links = target.links.filter((link) => link.from === id || link.to === id);
    const neighbours = new Set(links.flatMap((link) => [link.from, link.to]));
    const near = [
      box,
      ...links.map((link) => link.box),
      ...target.parts.filter((part) => neighbours.has(part.id)).map((part) => part.box),
    ];
    const area = unionBox(near)!;
    show(index, { x: area.x - 48, y: area.y - 48, width: area.width + 96, height: area.height + 96 });
  }, [model.stages, show]);

  /** Follows a part into the data flow it takes part in, keeping the way back. */
  const followFlow = useCallback((id: string) => {
    const destination = model.parts[id]?.appearsIn.find(
      (appearance) => appearance.lens === "data-flow" && appearance.stage !== live.current.stageIndex,
    );
    if (!destination) return;
    setTrail((current) => [...current, { stage: live.current.stageIndex, selected: id }]);
    selectPart(id, destination.stage);
  }, [model.parts, selectPart]);

  const goBack = useCallback(() => {
    const previous = trail[trail.length - 1];
    if (!previous) return;
    setTrail(trail.slice(0, -1));
    if (previous.selected) selectPart(previous.selected, previous.stage);
    else show(previous.stage, undefined);
  }, [selectPart, show, trail]);

  const openFinding = useCallback((finding: Finding) => {
    setActiveFinding(finding.fingerprint);
    if (finding.nodes[0]) selectPart(finding.nodes[0]);
    setTab("review");
  }, [selectPart]);

  /* ── Deep links: #architecture, #data-flow, #view=, #walkthrough, #step=, #finding=, #node= ── */

  useEffect(() => {
    const apply = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash) return;
      const [key, value = ""] = hash.split("=");
      if (key === "architecture" || key === "data-flow") {
        const index = model.stages.findIndex((candidate) => candidate.lens === key);
        if (index >= 0) setStageIndex(index);
      } else if (key === "view") {
        const index = model.stages.findIndex((candidate) => candidate.key === `view=${value}`);
        if (index >= 0) setStageIndex(index);
      } else if (key === "walkthrough") {
        goToStep(0);
      } else if (key === "step") {
        goToStep(Number(value) - 1);
      } else if (key === "finding") {
        const finding = model.findings.find((candidate) => candidate.fingerprint === value);
        if (finding) openFinding(finding);
      } else if (key === "node") {
        selectPart(value);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isNarrow()) setPanelOpen(false);
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // Storage can be unavailable; dark is fine.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    playClick();
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // Not remembered, still switched.
      }
      return next;
    });
  }, []);

  /* ── Keyboard ───────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]") || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "w" || key === " ") {
        event.preventDefault();
        if (step === null) goToStep(0);
        else stopWalkthrough();
      } else if (key === "arrowright" || key === "arrowdown") {
        event.preventDefault();
        goToStep(step === null ? 0 : Math.min(step + 1, model.steps.length - 1));
      } else if (key === "arrowleft" || key === "arrowup") {
        if (step !== null) {
          event.preventDefault();
          goToStep(Math.max(step - 1, 0));
        }
      } else if (key === "escape") {
        if (step !== null) stopWalkthrough();
        else {
          live.current.selected = null;
          setSelected(null);
        }
      } else if (key === "f") frame(undefined);
      else if (key === "+" || key === "=") zoomBy(1.25);
      else if (key === "-") zoomBy(0.8);
      else if (key === "t") toggleTheme();
      else if (/^[1-9]$/.test(key) && model.stages[Number(key) - 1]) {
        setStep(null);
        setStageIndex(Number(key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frame, goToStep, model.stages, model.steps.length, step, stopWalkthrough, toggleTheme, zoomBy]);

  /* ── Pointer: drag to pan, pinch or wheel to zoom ───────────────────── */

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomBy(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015)), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const onPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved.current = 0;
    pinch.current = null;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    setGliding(false);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) {
        const rect = viewport.current!.getBoundingClientRect();
        zoomBy(distance / pinch.current, { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top });
      }
      pinch.current = distance;
      moved.current += 10;
      return;
    }
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    setCamera((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused; the address bar still has it.
    }
  };

  const selectedPart: Part | undefined = selected ? model.parts[selected] : undefined;
  const spotlight = useMemo(() => mergeBoxes(walking?.boxes ?? []), [walking]);
  // A selected part lights up with its live connections and neighbours; the rest dims.
  const neighbourhood = useMemo(() => {
    if (walking || !selected || !stage) return [];
    const links = stage.links.filter((link) => link.from === selected || link.to === selected);
    const others = new Set(links.flatMap((link) => [link.from, link.to]));
    others.add(selected);
    return [
      ...stage.parts.filter((part) => others.has(part.id)).map((part) => part.box),
      ...links.map((link) => link.box),
    ];
  }, [walking, selected, stage]);
  const holes = spotlight.length > 0 ? spotlight : neighbourhood;
  const followable = selected
    ? model.parts[selected]?.appearsIn.find((appearance) => appearance.lens === "data-flow" && appearance.stage !== stageIndex)
    : undefined;
  const findingCount = model.findings.length;
  const stats = useMemo(() => model.stats, [model.stats]);

  const partHint = (id: string) => {
    const part = model.parts[id];
    const flows = part?.appearsIn.some((appearance) => appearance.lens === "data-flow");
    return `${part?.label ?? id}: click to light up its connections${flows ? ", double-click to follow its flow" : ""}`;
  };

  if (!stage) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center text-fg-2">
        This analysis has no diagram to show.
      </main>
    );
  }

  return (
    <div data-theme={theme} className="flex h-dvh flex-col bg-ink-900 text-fg">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4">
        <Link href="/" aria-label="Contour home" className="shrink-0">
          <ContourLogo size={24} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{model.title}</p>
          <a href={model.prUrl} target="_blank" rel="noopener noreferrer" className="link block truncate font-mono text-xs">
            {model.repo}#{model.prNumber} · {model.headSha.slice(0, 7)}
          </a>
        </div>
        <button type="button" onClick={() => (step === null ? goToStep(0) : stopWalkthrough())} disabled={model.steps.length === 0}
          className="btn-secondary h-9 shrink-0 px-3 text-[13px] disabled:opacity-40">
          {step === null ? <Play size={16} strokeWidth={1.5} /> : <X size={16} strokeWidth={1.5} />}
          <span className="hidden sm:inline">{step === null ? "Walkthrough" : "Stop"}</span>
          <kbd className="hidden rounded border border-line px-1 font-mono text-[11px] text-fg-3 md:inline">W</kbd>
        </button>
        <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"} className="btn-secondary h-9 w-9 shrink-0 px-0">
          {theme === "dark" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
        </button>
        <button type="button" onClick={copyLink} aria-label="Copy share link" className="btn-secondary h-9 w-9 shrink-0 px-0">
          {copied ? <Check size={16} strokeWidth={1.5} /> : <Link2 size={16} strokeWidth={1.5} />}
        </button>
        <button type="button" onClick={() => setPanelOpen((open) => !open)} aria-label="Toggle details" aria-pressed={panelOpen}
          className="btn-secondary h-9 w-9 shrink-0 px-0">
          <PanelRight size={16} strokeWidth={1.5} />
        </button>
      </header>

      {/* Stage tabs */}
      <nav role="tablist" aria-label="Diagrams" className="flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-3 [scrollbar-width:none] sm:px-4">
        {model.stages.map((candidate, index) => (
          <button key={candidate.key} type="button" role="tab" aria-selected={index === stageIndex}
            onClick={() => { setStep(null); setStageIndex(index); }}
            className={`-mb-px h-10 shrink-0 border-b-2 px-3 text-sm transition-colors duration-150 ease-out ${
              index === stageIndex ? "border-accent text-fg" : "border-transparent text-fg-2 hover:text-fg"}`}>
            {candidate.title}
          </button>
        ))}
      </nav>

      <div className="relative flex min-h-0 flex-1">
        {/* Canvas */}
        <div ref={viewport} className="relative min-w-0 flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
          style={{ background: theme === "dark" ? "#0d1117" : "#f4f5f7" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="absolute left-0 top-0 origin-top-left will-change-transform"
            style={{
              width: stage.width,
              height: stage.height,
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`,
              transition: gliding ? "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme === "dark" ? stage.dark : stage.light} width={stage.width} height={stage.height}
              alt={stage.title} draggable={false} className="pointer-events-none block select-none" />
            <svg className="absolute inset-0" width={stage.width} height={stage.height} viewBox={`0 0 ${stage.width} ${stage.height}`}>
              {holes.length > 0 && (
                <>
                  <defs>
                    <mask id="spotlight">
                      <rect width={stage.width} height={stage.height} fill="white" />
                      {holes.map((box, index) => (
                        <rect key={index} x={box.x - 10} y={box.y - 10} width={box.width + 20} height={box.height + 20} rx={14} fill="black" />
                      ))}
                    </mask>
                  </defs>
                  <rect width={stage.width} height={stage.height} mask="url(#spotlight)" className="pointer-events-none"
                    fill={theme === "dark" ? "#0d1117" : "#f4f5f7"} opacity={spotlight.length > 0 ? 0.72 : 0.6} />
                  {spotlight.map((box, index) => (
                    <rect key={index} x={box.x - 10} y={box.y - 10} width={box.width + 20} height={box.height + 20} rx={14}
                      fill="none" stroke="#3fb950" strokeWidth={2} vectorEffect="non-scaling-stroke" className="pointer-events-none" />
                  ))}
                </>
              )}
              {stage.parts.map(({ id, box }) => {
                const isSelected = id === selected;
                const flagged = (model.parts[id]?.findings.length ?? 0) > 0;
                return (
                  <g key={id}>
                    <rect x={box.x - 3} y={box.y - 3} width={box.width + 6} height={box.height + 6} rx={11}
                      fill="transparent" stroke={isSelected ? "#3fb950" : "transparent"} strokeWidth={2}
                      vectorEffect="non-scaling-stroke" role="button" tabIndex={0}
                      aria-label={`${model.parts[id]?.label ?? id}${flagged ? ", has review findings" : ""}`}
                      className="cursor-pointer outline-none transition-[stroke] duration-150 hover:stroke-fg/40 focus-visible:stroke-accent"
                      onClick={() => { if (moved.current < 6) selectPart(id); }}
                      onDoubleClick={() => followFlow(id)}
                      onKeyDown={(event) => { if (event.key === "Enter") selectPart(id); }}>
                      <title>{partHint(id)}</title>
                    </rect>
                    {flagged && (
                      <circle cx={box.x + box.width - 4} cy={box.y + 4} r={5} fill="#f85149" stroke={theme === "dark" ? "#0d1117" : "#ffffff"}
                        strokeWidth={2} vectorEffect="non-scaling-stroke" className="pointer-events-none" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Way back after following a part into its flow */}
          {trail.length > 0 && (
            <button type="button" onClick={goBack}
              className="absolute left-4 top-4 inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-ink-850/95 px-3 text-sm text-fg backdrop-blur hover:bg-ink-700">
              <ArrowLeft size={16} strokeWidth={1.5} />
              Back to {model.stages[trail[trail.length - 1]!.stage]?.title}
            </button>
          )}

          {/* Selected part: follow it into its flow straight from the canvas */}
          {followable && selected && step === null && (
            <button type="button" onClick={() => followFlow(selected)}
              className="btn-primary absolute right-4 top-4 h-9 max-w-[calc(100%-2rem)] px-3 text-[13px]">
              <span className="truncate">Follow {model.parts[selected]?.label} into the data flow</span>
              <ArrowRight size={16} strokeWidth={1.5} className="shrink-0" />
            </button>
          )}

          {/* First-visit hint, so nobody has to discover that parts are live */}
          {!hinted && step === null && stage.parts.length > 0 && (
            <p className="pointer-events-none absolute bottom-4 right-4 hidden rounded-xl border border-line bg-ink-850/95 px-3 py-2 text-[13px] text-fg-2 backdrop-blur sm:block">
              Click a part to light up its connections · double-click to follow its flow · <kbd className="font-mono text-fg">W</kbd> plays the walkthrough
            </p>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl border border-line bg-ink-850/90 p-1 backdrop-blur">
            <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-2 hover:bg-ink-700 hover:text-fg"><Minus size={16} strokeWidth={1.5} /></button>
            <span className="w-12 text-center font-mono text-xs tabular-nums text-fg-2">{Math.round(camera.k * 100)}%</span>
            <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-2 hover:bg-ink-700 hover:text-fg"><Plus size={16} strokeWidth={1.5} /></button>
            <button type="button" onClick={() => frame(undefined)} aria-label="Fit" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-2 hover:bg-ink-700 hover:text-fg"><Maximize size={16} strokeWidth={1.5} /></button>
          </div>

          {/* Walkthrough card */}
          {walking && step !== null && (
            <div className="absolute inset-x-3 bottom-4 mx-auto max-w-xl rounded-2xl border border-line bg-ink-850/95 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur sm:inset-x-auto sm:left-1/2 sm:w-[560px] sm:-translate-x-1/2">
              <div className="mb-3 flex gap-1" aria-hidden="true">
                {model.steps.map((_, index) => (
                  <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-fg/10"}`} />
                ))}
              </div>
              <p className="font-mono text-xs tabular-nums text-fg-3">Step {step + 1} of {model.steps.length}</p>
              <p className="mt-1 text-[17px] font-medium">{walking.heading}</p>
              <p className="mt-1 text-sm leading-6 text-fg-2">{walking.body}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" onClick={stopWalkthrough} className="link text-sm">Esc to leave</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => goToStep(step - 1)} disabled={step === 0} aria-label="Previous step"
                    className="btn-secondary h-9 w-9 px-0 disabled:opacity-40"><ChevronLeft size={16} strokeWidth={1.5} /></button>
                  {step < model.steps.length - 1 ? (
                    <button type="button" onClick={() => goToStep(step + 1)} className="btn-primary h-9 px-4 text-[13px]">
                      Next <ChevronRight size={16} strokeWidth={1.5} />
                    </button>
                  ) : (
                    <button type="button" onClick={stopWalkthrough} className="btn-primary h-9 px-4 text-[13px]">Done</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {panelOpen && (
          <aside className="absolute inset-x-0 bottom-0 z-10 flex max-h-[60%] flex-col border-t border-line bg-ink-900 md:static md:max-h-none md:w-[380px] md:shrink-0 md:border-l md:border-t-0">
            <div role="tablist" aria-label="Details" className="flex shrink-0 gap-1 border-b border-line px-3">
              {([
                ["overview", "Overview"],
                ["review", findingCount ? `Review · ${findingCount}` : "Review"],
                ...(selectedPart ? [["part", "Part"] as const] : []),
              ] as const).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={`-mb-px h-10 border-b-2 px-3 text-sm transition-colors duration-150 ease-out ${
                    tab === key ? "border-accent text-fg" : "border-transparent text-fg-2 hover:text-fg"}`}>
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close details" className="ml-auto flex h-10 w-8 items-center justify-center text-fg-3 hover:text-fg md:hidden">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">
              {tab === "overview" && (
                <div className="space-y-6">
                  {model.summary && <p className="leading-6 text-fg-2">{model.summary}</p>}
                  <p className="font-mono text-xs tabular-nums text-fg-3">
                    {stats.files ?? 0} files <span className="text-added">+{stats.additions ?? 0}</span>{" "}
                    <span className="text-removed">−{stats.deletions ?? 0}</span>
                  </p>
                  {stage.summary && (
                    <div>
                      <p className="mb-1 font-medium">{stage.title}</p>
                      <p className="leading-6 text-fg-2">{stage.summary}</p>
                    </div>
                  )}
                  {model.readFirst.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium">Read these files first</p>
                      <ol className="space-y-3">
                        {model.readFirst.map((file, index) => (
                          <li key={file.path} className="grid grid-cols-[20px_1fr] gap-2">
                            <span className="font-mono text-xs tabular-nums text-fg-3">{index + 1}</span>
                            <span className="min-w-0">
                              <a href={file.href} target="_blank" rel="noopener noreferrer" className="block break-all font-mono text-[13px] text-fg hover:text-accent">{file.path}</a>
                              {file.reason && <span className="mt-0.5 block text-xs leading-5 text-fg-3">{file.reason.replaceAll("`", "")}</span>}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <div>
                    <p className="mb-2 font-medium">Keys</p>
                    <dl className="grid grid-cols-[72px_1fr] gap-y-1.5 text-xs text-fg-2">
                      {[["W", "play or stop the walkthrough"], ["← →", "previous or next step"], ["F", "fit the diagram"], ["+ −", "zoom"], ["1–9", "switch diagram"], ["T", "light or dark"], ["Esc", "leave the walkthrough"]].map(([key, action]) => (
                        <div key={key} className="contents">
                          <dt className="font-mono text-fg-3">{key}</dt>
                          <dd>{action}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}

              {tab === "review" && (
                <div className="space-y-3">
                  {model.reviewStatus === "failed" && <p className="text-fg-2">The review could not run on this push. The next push tries again.</p>}
                  {model.reviewStatus === "none" && <p className="text-fg-2">This analysis ran before reviews were added.</p>}
                  {model.reviewStatus === "complete" && findingCount === 0 && <p className="text-fg-2">No issues found in this push.</p>}
                  {model.findings.map((finding) => (
                    <article key={finding.fingerprint}
                      className={`rounded-xl border p-3 transition-colors duration-150 ${activeFinding === finding.fingerprint ? "border-accent/60 bg-ink-850" : "border-line"}`}>
                      <button type="button" onClick={() => openFinding(finding)} className="block w-full text-left">
                        <p className="text-xs">
                          <span className={SEVERITY_COLOR[finding.severity]}>{SEVERITY_LABEL[finding.severity]}</span>
                          <span className="text-fg-3"> · {finding.category}</span>
                        </p>
                        <p className="mt-1 font-medium leading-5">{finding.title.replaceAll("`", "")}</p>
                      </button>
                      <p className="mt-2 leading-6 text-fg-2">{finding.body}</p>
                      {finding.suggestion && (
                        <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-ink-950 p-2 font-mono text-xs leading-5 text-fg-2">{finding.suggestion}</pre>
                      )}
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-mono text-fg-3">{finding.file}:{finding.startLine}{finding.endLine > finding.startLine ? `-${finding.endLine}` : ""}</span>
                        {finding.url && (
                          <a href={finding.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                            Comment on GitHub <ExternalLink size={12} strokeWidth={1.5} />
                          </a>
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              {tab === "part" && selectedPart && (
                <div className="space-y-5">
                  <div>
                    <p className="text-[17px] font-medium">{selectedPart.label}</p>
                    <p className="mt-1 text-xs">
                      <span className={DELTA_COLOR[selectedPart.delta] ?? "text-fg-3"}>{selectedPart.delta}</span>
                      <span className="text-fg-3"> · {selectedPart.kind}{selectedPart.lane ? ` · ${selectedPart.lane}` : ""}</span>
                    </p>
                    {selectedPart.subtitle && <p className="mt-2 font-mono text-xs text-fg-2">{selectedPart.subtitle}</p>}
                    {selectedPart.summary && <p className="mt-2 leading-6 text-fg-2">{selectedPart.summary}</p>}
                  </div>
                  {selectedPart.lines.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium">Changed lines</p>
                      <ul className="space-y-2">
                        {selectedPart.lines.map((line) => (
                          <li key={line.label + line.href}>
                            <a href={line.href} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[13px] text-fg hover:text-accent">{line.label}</a>
                            {line.detail && <p className="text-xs leading-5 text-fg-3">{line.detail}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedPart.appearsIn.length > 1 && (
                    <div>
                      <p className="mb-2 font-medium">Drawn in</p>
                      <ul className="space-y-1.5">
                        {selectedPart.appearsIn.map((appearance) => (
                          <li key={appearance.stage}>
                            <button type="button" disabled={appearance.stage === stageIndex}
                              onClick={() => {
                                setTrail((current) => [...current, { stage: stageIndex, selected: selectedPart.id }]);
                                selectPart(selectedPart.id, appearance.stage);
                              }}
                              className="inline-flex items-center gap-1.5 text-left text-accent hover:underline disabled:text-fg-3 disabled:no-underline">
                              {appearance.title}
                              <span className="text-xs text-fg-3">
                                {appearance.lens === "data-flow" ? "flow" : "architecture"}
                                {appearance.stage === stageIndex ? " · showing" : ""}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedPart.connections.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium">Connections</p>
                      <ul className="space-y-1.5 text-fg-2">
                        {selectedPart.connections.map((connection, index) => (
                          <li key={index} className="grid grid-cols-[20px_1fr] gap-1">
                            <span className="font-mono text-fg-3" aria-label={connection.direction === "out" ? "to" : "from"}>{connection.direction === "out" ? "→" : "←"}</span>
                            <span>{connection.other}{connection.label ? <span className="text-fg-3"> · {connection.label}</span> : null}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedPart.findings.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium">Review findings here</p>
                      <ul className="space-y-1.5">
                        {model.findings.filter((finding) => selectedPart.findings.includes(finding.fingerprint)).map((finding) => (
                          <li key={finding.fingerprint}>
                            <button type="button" onClick={() => openFinding(finding)} className="text-left hover:text-accent">
                              <span className={SEVERITY_COLOR[finding.severity]}>{SEVERITY_LABEL[finding.severity]}</span>
                              <span className="text-fg-2"> · {finding.title.replaceAll("`", "")}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
