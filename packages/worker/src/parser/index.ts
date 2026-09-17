import type { ParsedSymbol } from "@contour/shared";
import { parseTypeScript } from "./typescript.js";

/**
 * Language-agnostic parser router.
 *
 * Routes TS/JS files to the ts-morph AST parser.
 * For other languages, returns file-level stub symbols (no AST depth)
 * so the LLM still gets file context, just without fan-in or test-ref data.
 */
export async function parseChangedFiles(
  changedFiles: string[],
  projectRoot: string
): Promise<ParsedSymbol[]> {
  const tsJsFiles = changedFiles.filter((f) =>
    /\.(ts|tsx|js|jsx|mts|mjs)$/.test(f)
  );
  const otherFiles = changedFiles.filter(
    (f) => !/\.(ts|tsx|js|jsx|mts|mjs)$/.test(f)
  );

  const [tsSymbols, stubSymbols] = await Promise.all([
    tsJsFiles.length > 0
      ? parseTypeScript(tsJsFiles, projectRoot).catch(() => [] as ParsedSymbol[])
      : Promise.resolve([] as ParsedSymbol[]),
    Promise.resolve(buildStubSymbols(otherFiles)),
  ]);

  return [...tsSymbols, ...stubSymbols];
}

/**
 * For non-TS/JS files, creates file-level stub symbols so the LLM
 * still receives context about what changed — just without deep AST detail.
 */
function buildStubSymbols(files: string[]): ParsedSymbol[] {
  return files.map((filePath) => {
    const parts = filePath.split(/[\\/]/);
    const basename = parts[parts.length - 1];
    const name = basename.replace(/\.[^.]+$/, "");

    // Guess kind from path patterns
    const kind = guessKind(filePath);

    return {
      name,
      filePath,
      kind,
      fanIn: 0,
      hasTestReference: false,
    };
  });
}

function guessKind(filePath: string): ParsedSymbol["kind"] {
  const lower = filePath.toLowerCase();
  if (/\/(api|routes?|controllers?|handlers?)\//i.test(lower)) return "route";
  if (/\/(services?|providers?|managers?)\//i.test(lower)) return "service";
  if (/\/(store|state|redux|zustand|context)\//i.test(lower)) return "store";
  return "function";
}
