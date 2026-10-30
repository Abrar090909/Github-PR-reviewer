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
    <main className="flex min-h-screen items-center justify-center px-4 sm:px-6">
      <section className="w-full max-w-xl rounded-2xl border border-line bg-ink-850 p-8 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2 font-medium" aria-label="Contour home">
          <ContourLogo size={28} />
          Contour
        </Link>
        <p className="mt-10 font-mono text-[13px] text-accent">Installation complete</p>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em]">Contour is ready</h1>
        <p className="mt-4 text-[15px] leading-7 text-fg-2">
          Open a pull request in any repository you selected. Contour analyzes it automatically and keeps one
          architecture comment updated as new commits arrive.
        </p>
        {installationId ? <p className="mt-4 font-mono text-xs text-fg-3">Installation {installationId}</p> : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="https://github.com/pulls" className="btn-primary">
            Open your pull requests
          </a>
          <Link href="/" className="btn-secondary">
            Back to Contour
          </Link>
        </div>
      </section>
    </main>
  );
}
