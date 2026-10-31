import Link from "next/link";
import { example } from "@/lib/showcase";
import Walkthrough from "./Walkthrough";

export default function LiveExample() {
  return (
    <section id="live-example" className="section">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">Example walkthrough</p>
          <h2 className="heading">{example.pullRequest?.title ?? example.title}</h2>
          <p className="mt-4 text-[15px] leading-7 text-fg-2">
            Fourteen files change to move a broadcast email sender from one Postmark call per recipient to batches of
            500. This is the walkthrough from the example document that ships with Contour, each step shown on the
            diagram it explains, drawn by the same renderer that posts PR comments.
          </p>
        </div>
        <Walkthrough steps={example.steps} />
        <Link href="/r/example#walkthrough" className="btn-secondary mt-6">
          Open it on the interactive map
        </Link>
      </div>
    </section>
  );
}
