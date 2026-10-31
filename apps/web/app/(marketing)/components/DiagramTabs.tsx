"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import type { Diagram } from "@/lib/showcase";

type Tab = { label: string; diagram: Diagram; href: string };

export default function DiagramTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  const current = tabs[active]!;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div role="tablist" aria-label="Lens" className="inline-flex rounded-lg border border-line bg-ink-950 p-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={`h-8 rounded-md px-3 text-sm transition-colors duration-150 ease-out ${
                index === active
                  ? "bg-ink-700 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-fg-2 hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-2 text-xs" aria-label="Legend">
          <span className="chip-added">NEW</span>
          <span className="chip-modified">CHANGED</span>
          <span className="chip-removed">REMOVED</span>
        </p>
      </div>
      <Link
        href={current.href}
        role="tabpanel"
        aria-label={`${current.diagram.alt}. Open it on the interactive map`}
        className="group relative mt-4 block overflow-x-auto border-t border-line bg-[#0d1117] p-2 sm:p-4"
      >
        <Image
          key={current.diagram.src}
          src={current.diagram.src}
          width={current.diagram.width}
          height={current.diagram.height}
          alt={current.diagram.alt}
          priority
          unoptimized
          className="mx-auto h-auto w-full min-w-[640px] max-w-[1040px]"
        />
        <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-850/95 px-3 py-1.5 text-[13px] text-fg opacity-90 transition-opacity duration-150 group-hover:opacity-100">
          <Maximize2 size={14} strokeWidth={1.5} />
          Open the interactive map
        </span>
      </Link>
    </div>
  );
}
