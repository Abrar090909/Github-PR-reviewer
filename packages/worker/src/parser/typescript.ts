import { Project, SyntaxKind, Node, SourceFile } from "ts-morph";
import type { ParsedSymbol, NodeKind } from "@contour/shared";
import * as path from "path";

/**
 * TypeScript/JavaScript AST parser using ts-morph.
 *
 * Extracts:
 * - Exported functions, classes, and arrow functions touched by the diff
 * - Fan-in (number of other files that import each symbol)
 * - Whether a corresponding test file imports the symbol
 */
export async function parseTypeScript(
  changedFiles: string[],
  projectRoot: string
): Promise<ParsedSymbol[]> {
  const tsFiles = changedFiles.filter((f) =>
    /\.(ts|tsx|js|jsx|mts|mjs)$/.test(f)
  );

  if (tsFiles.length === 0) return [];

  const project = new Project({
    tsConfigFilePath: path.join(projectRoot, "tsconfig.json"),
    skipFileDependencyResolution: false,
  });

  const symbols: ParsedSymbol[] = [];

  for (const relPath of tsFiles) {
    const absPath = path.join(projectRoot, relPath);
    const sourceFile = project.getSourceFile(absPath);
    if (!sourceFile) continue;

    const exports = extractExports(sourceFile);

    for (const exp of exports) {
      const fanIn = computeFanIn(project, sourceFile, exp.name);
      const hasTestRef = checkTestReference(project, sourceFile, exp.name);

      symbols.push({
        name: exp.name,
        filePath: relPath,
        kind: exp.kind,
        fanIn,
        hasTestReference: hasTestRef,
      });
    }
  }

  return symbols;
}

interface ExtractedExport {
  name: string;
  kind: NodeKind;
}

function extractExports(sourceFile: SourceFile): ExtractedExport[] {
  const results: ExtractedExport[] = [];

  // Exported function declarations
  sourceFile.getFunctions().forEach((fn) => {
    if (fn.isExported() && fn.getName()) {
      results.push({ name: fn.getName()!, kind: "function" });
    }
  });

  // Exported class declarations
  sourceFile.getClasses().forEach((cls) => {
    if (cls.isExported() && cls.getName()) {
      results.push({ name: cls.getName()!, kind: "service" });
    }
  });

  // Exported arrow function variables
  sourceFile.getVariableDeclarations().forEach((decl) => {
    const initializer = decl.getInitializer();
    if (
      initializer &&
      Node.isArrowFunction(initializer) &&
      decl.getVariableStatement()?.isExported()
    ) {
      results.push({ name: decl.getName(), kind: "function" });
    }
  });

  // Default export
  const defaultExport = sourceFile.getDefaultExportSymbol();
  if (defaultExport) {
    const name = defaultExport.getName();
    if (name && name !== "default") {
      results.push({ name, kind: "function" });
    }
  }

  return results;
}

function computeFanIn(
  project: Project,
  targetFile: SourceFile,
  symbolName: string
): number {
  let count = 0;
  const targetPath = targetFile.getFilePath();

  for (const sourceFile of project.getSourceFiles()) {
    if (sourceFile.getFilePath() === targetPath) continue;

    const imports = sourceFile.getImportDeclarations();
    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifierSourceFile();
      if (!moduleSpecifier) continue;
      if (moduleSpecifier.getFilePath() !== targetPath) continue;

      const namedImports = imp.getNamedImports().map((n) => n.getName());
      const defaultImport = imp.getDefaultImport()?.getText();

      if (namedImports.includes(symbolName) || defaultImport === symbolName) {
        count++;
        break;
      }
    }
  }

  return count;
}

function checkTestReference(
  project: Project,
  targetFile: SourceFile,
  symbolName: string
): boolean {
  const targetPath = targetFile.getFilePath();

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (!/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath)) continue;

    const imports = sourceFile.getImportDeclarations();
    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifierSourceFile();
      if (!moduleSpecifier) continue;
      if (moduleSpecifier.getFilePath() !== targetPath) continue;

      const namedImports = imp.getNamedImports().map((n) => n.getName());
      if (namedImports.includes(symbolName)) return true;
    }
  }

  return false;
}
