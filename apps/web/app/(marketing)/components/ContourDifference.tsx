import { example } from "@/lib/showcase";
import FeatureBento from "./FeatureBento";

export default function ContourDifference() {
  return (
    <section id="features" className="section">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">What you get</p>
        <h2 className="heading max-w-2xl">A diagram you can check, not a summary you have to trust</h2>
        <FeatureBento steps={{ total: example.steps.length, first: example.steps[0]?.heading ?? "", second: example.steps[1]?.heading ?? "" }} />
      </div>
    </section>
  );
}
