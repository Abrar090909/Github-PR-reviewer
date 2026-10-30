"use client";

import Image from "next/image";
import { useState } from "react";
import type { Diagram } from "@/lib/showcase";

export default function DiagramTabs({ tabs }: { tabs: { label: string; diagram: Diagram }[] }) {
  const [active, setActive] = useState(0);
  const current = tabs[active]!;

  return (
    <div>
      <div role="tablist" aria-label="Lens" className="flex gap-1 border-b border-line px-4 sm:px-6">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => setActive(index)}
            className={`-mb-px h-10 border-b-2 px-3 text-sm transition-colors duration-150 ease-out ${
              index === active ? "border-accent text-fg" : "border-transparent text-fg-2 hover:text-fg"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="overflow-x-auto p-2 sm:p-4">
        <Image
          key={current.diagram.alt}
          src={current.diagram.src}
          width={current.diagram.width}
          height={current.diagram.height}
          alt={current.diagram.alt}
          priority
          className="mx-auto h-auto w-full min-w-[720px] max-w-[1080px]"
        />
      </div>
    </div>
  );
}
