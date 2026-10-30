"use client";

import Image from "next/image";
import { useState } from "react";
import type { Diagram } from "@/lib/showcase";

type Step = { id: string; heading: string; body: string; diagram: Diagram };

export default function Walkthrough({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const current = steps[active];
  if (!current) return null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <ol className="flex flex-col gap-1">
        {steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              aria-current={index === active ? "step" : undefined}
              onClick={() => setActive(index)}
              className={`grid w-full grid-cols-[28px_1fr] gap-2 rounded-xl border px-4 py-3 text-left transition-colors duration-150 ease-out ${
                index === active
                  ? "border-line bg-ink-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border-transparent hover:bg-ink-850"
              }`}
            >
              <span className={`font-mono text-[13px] tabular-nums ${index === active ? "text-accent" : "text-fg-3"}`}>
                {index + 1}
              </span>
              <span>
                <span className={`block text-[15px] ${index === active ? "text-fg" : "text-fg-2"}`}>{step.heading}</span>
                {index === active && <span className="mt-1 block text-sm leading-6 text-fg-2">{step.body}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="overflow-x-auto rounded-2xl border border-line bg-ink-900 p-2 sm:p-4">
        <Image
          key={current.diagram.alt}
          src={current.diagram.src}
          width={current.diagram.width}
          height={current.diagram.height}
          alt={current.diagram.alt}
          className="mx-auto h-auto w-full min-w-[640px]"
        />
      </div>
    </div>
  );
}
