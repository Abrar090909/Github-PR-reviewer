import Link from "next/link";
import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";
import { example } from "@/lib/showcase";
import GitHubMark from "../../components/GitHubMark";
import Walkthrough from "./Walkthrough";

export default function LiveExample() {
  return (
    <section id="live-example" className="section">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">Try the walkthrough</p>
          <h2 className="heading">Step through a change the way a reviewer would</h2>
          <p className="lede">
            This is the example document that ships with Contour: a broadcast email sender moving from one Postmark call
            per recipient to batches of 500. Each step is shown on the diagram it explains.
          </p>
        </div>
        <Walkthrough steps={example.steps} />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/r/example#walkthrough" className="btn-primary">
            Play it on the interactive map
          </Link>
          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <GitHubMark />
            Add to GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
