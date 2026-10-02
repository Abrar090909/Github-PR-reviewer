import Link from "next/link";
import ContourLogo from "../components/ContourLogo";

export const metadata = {
  title: "Contour installed",
  description: "Contour is ready to analyze pull requests in the repositories you selected.",
};

export default async function SetupCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ installation_id?: string; setup_action?: string }>;
}) {
  const { installation_id: installationId } = await searchParams;

  return (
    <main className="min-h-screen bg-black text-[#EDEDED] flex items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-2xl border border-[#242424] bg-[#0A0A0A] p-8 sm:p-10">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-base font-semibold" aria-label="Contour home">
          <ContourLogo size={40} />
          Contour
        </Link>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#22C55E] text-xl">
          ✓
        </div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-[#22C55E]">
          Installation complete
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight">Contour is ready.</h1>
        <p className="mb-7 leading-7 text-[#A1A1A1]">
          Open a pull request in any repository you selected. Contour will analyze it automatically
          and keep one architecture comment updated as new commits arrive.
        </p>
        {installationId ? (
          <p className="mb-7 font-mono text-xs text-[#666]">Installation {installationId}</p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="https://github.com/pulls"
            className="inline-flex justify-center rounded-full bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-black"
          >
            View your pull requests
          </a>
          <Link
            href="/"
            className="inline-flex justify-center rounded-full border border-[#2A2A2A] px-5 py-2.5 text-sm text-[#D4D4D4]"
          >
            Back to Contour
          </Link>
        </div>
      </section>
    </main>
  );
}
