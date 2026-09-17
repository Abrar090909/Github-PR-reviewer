import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import AjvModule from "ajv";

// Resolve schema.json from packages/renderer/ using file-relative path.
// At runtime __dirname = packages/worker/dist/, so ../../renderer/schema.json
// resolves to packages/renderer/schema.json.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = join(__dirname, "../../renderer/schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf-8")) as Record<string, unknown>;

// Ajv v8 ESM interop: AjvModule.default is the constructor at runtime but
// TypeScript's typings don't reflect this cleanly in NodeNext mode.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ajv = new (AjvModule as any)({ allErrors: true }) as any;
const validate = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGraphDocument(doc: unknown): ValidationResult {
  const valid = validate(doc);
  if (valid) return { valid: true, errors: [] };

  const errors = (validate.errors ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => `${e.instancePath ?? ""} ${e.message ?? "unknown error"}`.trim()
  );
  return { valid: false, errors };
}
