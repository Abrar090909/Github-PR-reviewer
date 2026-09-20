"use client";

import { useState } from "react";
import type { GraphDocument } from "@contour/schema";

/*
  Live example — React 18 Concurrent Mode PR fixture.
  Always-on flow dots. Node hover shows behavior delta in a sidebar panel.
  Coverage lens tab changes card border to highlight untested nodes.
*/

const GRAPH: any = {
  schemaVersion: "1",
  kind: "graph",
  lenses: ["architecture", "coverage"],
  lanes: [
    { id: "reconciler", label: "Reconciler" },
    { id: "scheduler",  label: "Scheduler"  },
    { id: "events",     label: "Events"     },
  ],
  nodes: [
    {
      id: "fiber-reconciler",
      label: "FiberReconciler",
      sublabel: "react-reconciler/src",
      kind: "service",
      delta: "modified",
      lane: "reconciler",
      riskScore: 92,
      riskReasons: ["core rendering engine", "affects 19 other files", "no tests in this PR"],
      behaviorDelta: "Pauses rendering periodically so the user's screen never freezes.",
      testCoverage: "none-in-diff",
      fanIn: 19,
    },
    {
      id: "work-loop",
      label: "workLoopConcurrent",
      sublabel: "ReactFiberWorkLoop.js",
      kind: "function",
      delta: "new",
      lane: "reconciler",
      riskScore: 81,
      riskReasons: ["replaces old rendering loop", "no tests added in this PR"],
      behaviorDelta: "Checks remaining frame time before starting new render work.",
      testCoverage: "none-in-diff",
      fanIn: 3,
    },
    {
      id: "lane-model",
      label: "LaneModel",
      sublabel: "ReactFiberLane.js",
      kind: "function",
      delta: "new",
      lane: "reconciler",
      riskScore: 65,
      riskReasons: ["new priority model", "replaces expiration times"],
      behaviorDelta: "Replaces the expiration-time priority model with a bitmask lane system.",
      testCoverage: "covered",
      fanIn: 8,
    },
    {
      id: "scheduler",
      label: "Scheduler",
      sublabel: "packages/scheduler",
      kind: "service",
      delta: "modified",
      lane: "scheduler",
      riskScore: 74,
      riskReasons: ["performance-critical", "time-slicing logic"],
      behaviorDelta: "Uses MessageChannel for task scheduling instead of setTimeout.",
      testCoverage: "covered",
      fanIn: 7,
    },
    {
      id: "synthetic-events",
      label: "SyntheticEventSystem",
      sublabel: "packages/react-dom",
      kind: "service",
      delta: "modified",
      lane: "events",
      riskScore: 58,
      riskReasons: ["event system refactor", "affects all event handlers"],
      behaviorDelta: null,
      testCoverage: "covered",
      fanIn: 4,
    },
  ],
  edges: [
    { from: "work-loop",       to: "fiber-reconciler",  label: "drives"    },
    { from: "fiber-reconciler",to: "scheduler",         label: "yields to" },
    { from: "scheduler",       to: "work-loop",         label: "schedules" },
    { from: "lane-model",      to: "fiber-reconciler",  label: "priority"  },
    { from: "synthetic-events",to: "fiber-reconciler",  label: "triggers"  },
  ],
};

const POS: Record<string, { x: number; y: number }> = {
  "fiber-reconciler":  { x: 12, y: 52  },
  "work-loop":         { x: 12, y: 172 },
  "lane-model":        { x: 12, y: 292 },
  "scheduler":         { x: 288, y: 108 },
  "synthetic-events":  { x: 564, y: 168 },
};

const CARD_W = 244;
const CARD_H = 84;

function riskColor(s?: number) {
  if (s === undefined || s === null) return "var(--text-dim)";
  return s >= 71 ? "var(--risk-high)" : s >= 31 ? "var(--risk-mid)" : "var(--risk-low)";
}
function deltaColor(d: string) {
  return d === "new" ? "var(--delta-new)" : d === "removed" ? "var(--delta-removed)" : "var(--delta-modified)";
}
function edgePath(from: string, to: string) {
  const fp = POS[from]; const tp = POS[to];
  if (!fp || !tp) return "";
  const x1 = fp.x + CARD_W; const y1 = fp.y + CARD_H / 2;
  const x2 = tp.x;           const y2 = tp.y + CARD_H / 2;
  const cp = Math.abs(x2 - x1) * 0.38;
  return `M${x1},${y1} C${x1+cp},${y1} ${x2-cp},${y2} ${x2},${y2}`;
}

export default function LiveExample() {
  const [hovered, setHovered]   = useState<string | null>("fiber-reconciler");
  const [lens, setLens]         = useState<"architecture" | "coverage">("architecture");
  const hoveredNode = (hovered ? GRAPH.nodes.find((n: any) => n.id === hovered) : null) || GRAPH.nodes[0];
  const highRisk    = GRAPH.nodes.filter((n: any) => n.riskScore >= 71).sort((a: any, b: any) => b.riskScore - a.riskScore);
  const untested    = GRAPH.nodes.filter((n: any) => n.testCoverage === "none-in-diff").length;
  const overallRisk = Math.round(GRAPH.nodes.reduce((a: number, n: any) => a + n.riskScore, 0) / GRAPH.nodes.length);

  return (
    <section id="live-example" style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 12 }}>
              REAL-WORLD CODE REVIEW EXAMPLE
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text-primary)", margin: 0 }}>
              React 18: How Contour breaks down a huge PR
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, margin: 0 }}>
              Instead of scrolling through 4,000 lines of code, click any box below to see what changed and what could break.
            </p>
          </div>

          {/* Summary strip — real data from the fixture */}
          <div style={{
            display: "flex",
            gap: 20,
            fontSize: 13,
            color: "var(--text-secondary)",
            alignItems: "center",
            padding: "10px 16px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            whiteSpace: "nowrap",
          }}>
            <span style={{ color: "var(--delta-new)", fontWeight: 600 }}>2 new</span>
            <span style={{ color: "var(--border-muted)" }}>·</span>
            <span style={{ color: "var(--delta-modified)", fontWeight: 600 }}>3 changed</span>
            <span style={{ color: "var(--border-muted)" }}>·</span>
            <span>Risk <strong style={{ color: "var(--risk-high)" }}>{overallRisk}</strong></span>
            <span style={{ color: "var(--border-muted)" }}>·</span>
            <span style={{ color: "var(--risk-mid)" }}>{untested} untested</span>
          </div>
        </div>

        {/* Lens switcher */}
        <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
          {(["architecture", "coverage"] as const).map(tab => (
            <button
              key={tab}
              id={`lens-tab-${tab}`}
              onClick={() => setLens(tab)}
              style={{
                fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                padding: "5px 14px",
                borderRadius: 4,
                border: "1px solid",
                borderColor: lens === tab ? "var(--border-muted)" : "transparent",
                background: lens === tab ? "var(--bg-surface)" : "transparent",
                color: lens === tab ? "var(--text-primary)" : "var(--text-dim)",
                cursor: "pointer",
                transition: "all 160ms",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>

          {/* Diagram */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            overflow: "hidden",
          }}>
            <svg
              viewBox="0 0 832 400"
              style={{ width: "100%", height: 400, display: "block" }}
              aria-label="React 18 Concurrent Mode PR architecture diagram"
            >
              {/* Lanes */}
              {[
                { x: 6,   label: "Reconciler", w: 268 },
                { x: 280, label: "Scheduler",  w: 268 },
                { x: 556, label: "Events",     w: 268 },
              ].map(lane => (
                <g key={lane.label}>
                  <rect x={lane.x} y={4} width={lane.w} height={392} rx={4}
                    fill="var(--bg-base)" stroke="var(--border)" strokeWidth={1}/>
                  <text x={lane.x + lane.w / 2} y={20} textAnchor="middle"
                    fill="var(--text-dim)" fontSize={9} fontWeight={500}
                    fontFamily="IBM Plex Mono, monospace" letterSpacing="0.12em">
                    {lane.label.toUpperCase()}
                  </text>
                </g>
              ))}

              {/* Edges with always-on flow dots */}
              {GRAPH.edges.map((edge: any, i: number) => {
                const path = edgePath(edge.from, edge.to);
                if (!path) return null;
                const isH = hovered === edge.from || hovered === edge.to;
                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <path d={path} fill="none"
                      stroke={isH ? "var(--accent)" : "var(--border-muted)"}
                      strokeWidth={isH ? 1.5 : 1}
                      style={{ transition: "stroke 160ms" }}
                    />
                    <circle r={3.5} fill={isH ? "var(--accent)" : "var(--text-dim)"} opacity={0.9}>
                      <animateMotion
                        dur={`${1.6 + i * 0.35}s`}
                        repeatCount="indefinite"
                        path={path}
                        keyTimes="0;0.06;0.88;1"
                        keyPoints="0;0;1;1"
                        calcMode="linear"
                      />
                      <animate
                        attributeName="opacity"
                        values="0;0.9;0.9;0"
                        keyTimes="0;0.06;0.88;1"
                        dur={`${1.6 + i * 0.35}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              })}

              {/* Nodes */}
              {GRAPH.nodes.map((node: any) => {
                const p = POS[node.id];
                if (!p) return null;
                const isH = hovered === node.id;
                const rc = riskColor(node.riskScore);
                const dc = deltaColor(node.delta);
                // In coverage lens, highlight untested nodes
                const coverageBorder = lens === "coverage" && node.testCoverage === "none-in-diff";

                return (
                  <g key={node.id} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <rect x={p.x} y={p.y} width={CARD_W} height={CARD_H} rx={4}
                      fill="var(--bg-raised)"
                      stroke={isH ? rc : coverageBorder ? "var(--risk-mid)" : "var(--border-muted)"}
                      strokeWidth={isH || coverageBorder ? 1.5 : 1}
                      style={{ transition: "stroke 160ms" }}
                    />
                    {/* Delta bar — state, not decoration */}
                    <rect x={p.x} y={p.y + 9} width={3} height={CARD_H - 18} rx={1.5} fill={dc}/>
                    {/* Label */}
                    <text x={p.x + 16} y={p.y + 28} fontSize={12} fontWeight={600}
                      fontFamily="Inter, system-ui, sans-serif" fill="var(--text-primary)">
                      {node.label}
                    </text>
                    {/* Sublabel */}
                    <text x={p.x + 16} y={p.y + 43} fontSize={10}
                      fontFamily="IBM Plex Mono, monospace" fill="var(--text-secondary)">
                      {node.sublabel}
                    </text>
                    {/* Caller count */}
                    {node.fanIn !== undefined && (
                      <text x={p.x + 16} y={p.y + 57} fontSize={9}
                        fontFamily="IBM Plex Mono, monospace" fill="var(--text-dim)">
                        {node.fanIn} caller{node.fanIn !== 1 ? "s" : ""}
                      </text>
                    )}
                    {/* Coverage absent */}
                    {node.testCoverage === "none-in-diff" && (
                      <>
                        <rect x={p.x + 16} y={p.y + 63} width={64} height={14} rx={3}
                          fill="none" stroke="var(--coverage-absent)" strokeWidth={1} strokeDasharray="3,2"/>
                        <text x={p.x + 21} y={p.y + 73} fontSize={9}
                          fontFamily="IBM Plex Mono, monospace" fill="var(--coverage-absent)">
                          no cover
                        </text>
                      </>
                    )}
                    {/* Risk chip */}
                    <rect x={p.x + CARD_W - 38} y={p.y + 9} width={30} height={18} rx={3} fill={rc}/>
                    <text x={p.x + CARD_W - 23} y={p.y + 19} textAnchor="middle"
                      dominantBaseline="middle" fontSize={10} fontWeight={700}
                      fontFamily="IBM Plex Mono, monospace" fill="var(--bg-base)">
                      {node.riskScore}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Risk panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Node detail on hover — fixed height, no scrollbar */}
            <div
              className="no-scrollbar"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: 16,
                height: 230,
                minHeight: 230,
                maxHeight: 230,
                overflow: "hidden",
              }}
            >
              {hoveredNode ? (
                <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <div style={{
                      minWidth: 34, height: 34, borderRadius: 4, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      background: riskColor(hoveredNode.riskScore),
                      fontSize: 12, fontWeight: 700,
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: "var(--bg-base)",
                    }}>
                      {hoveredNode.riskScore}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                        {hoveredNode.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 1 }}>
                        {hoveredNode.delta} · {hoveredNode.testCoverage === "none-in-diff" ? "no tests added" : "tested"}
                      </div>
                    </div>
                  </div>
                  {hoveredNode.behaviorDelta && (
                    <p style={{
                      fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6,
                      margin: "0 0 10px", padding: "8px 10px",
                      background: "var(--bg-subtle)", borderRadius: 4,
                      borderLeft: "2px solid var(--risk-mid)",
                    }}>
                      {hoveredNode.behaviorDelta}
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {hoveredNode.riskReasons?.map((r: string) => (
                      <span key={r} style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace" }}>
                        — {r}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>
                  Tap or hover any component to inspect what changed.
                </p>
              )}
            </div>

            {/* High-risk list */}
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>
              HIGH RISK COMPONENTS ({highRisk.length})
            </div>
            {highRisk.map((node: any) => (
              <div key={node.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px",
                  background: hovered === node.id ? "var(--bg-subtle)" : "var(--bg-surface)",
                  border: hovered === node.id ? "1px solid var(--border-muted)" : "1px solid var(--border)",
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "background 120ms, border-color 120ms",
                }}
                onMouseEnter={() => setHovered(node.id)}
                onClick={() => setHovered(node.id)}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                    {node.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                    {node.riskReasons?.[0] ?? ""}
                  </div>
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 3,
                  background: riskColor(node.riskScore),
                  color: "var(--bg-base)",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {node.riskScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
