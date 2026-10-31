import { DIAGRAM_NAMES, renderDiagram, type DiagramName } from "@/lib/showcase";

export const dynamic = "force-static";

export function generateStaticParams() {
  return DIAGRAM_NAMES.map((name) => ({ name: `${name}.svg` }));
}

/** The landing page's diagrams, rendered once at build time and cached like any other image. */
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const key = name.replace(/\.svg$/, "") as DiagramName;
  if (!DIAGRAM_NAMES.includes(key)) return new Response("Not found", { status: 404 });
  return new Response(renderDiagram(key).svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
