import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import type { GraphDocument, AnalysisInput } from "@contour/shared";
import type { LLMProvider } from "./index.js";
import { SYSTEM_PROMPT, buildUserPrompt, buildJsonRepairPrompt, buildSchemaRepairPrompt } from "./index.js";
import { validateGraphDocument } from "../schema-validator.js";
import { logger } from "../logger.js";

const MAX_ATTEMPTS = 2;

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  private client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  }

  async analyze(input: AnalysisInput): Promise<GraphDocument> {
    const model = this.client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = buildUserPrompt(input);
    logger.info({ provider: "gemini", repo: input.repoFullName, pr: input.prNumber }, "Calling LLM");

    const history: Content[] = [];
    let lastRawText = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(attempt === 1 ? userPrompt : history[history.length - 1]!.parts[0]!.text!);
      lastRawText = result.response.text().trim();

      // Try to extract JSON even if the model adds a tiny preamble
      const doc = tryParseJson(lastRawText);
      if (!doc.ok) {
        if (attempt === MAX_ATTEMPTS) {
          throw new Error(`Gemini returned non-JSON after ${MAX_ATTEMPTS} attempts: ${doc.reason}`);
        }
        logger.warn({ attempt, reason: doc.reason, provider: "gemini" }, "JSON parse failed — retrying");
        history.push(
          { role: "user", parts: [{ text: attempt === 1 ? userPrompt : history[history.length - 1]!.parts[0]!.text! }] },
          { role: "model", parts: [{ text: lastRawText }] },
          { role: "user", parts: [{ text: buildJsonRepairPrompt(doc.reason) }] },
        );
        continue;
      }

      const validation = validateGraphDocument(doc.value);
      if (validation.valid) {
        return doc.value;
      }

      if (attempt === MAX_ATTEMPTS) {
        logger.error({ errors: validation.errors, provider: "gemini" }, "Schema validation failed after retries");
        throw new Error(`Gemini document invalid after ${MAX_ATTEMPTS} attempts`);
      }

      logger.warn({ attempt, errors: validation.errors, provider: "gemini" }, "Schema invalid — repairing");
      history.push(
        { role: "user", parts: [{ text: attempt === 1 ? userPrompt : history[history.length - 1]!.parts[0]!.text! }] },
        { role: "model", parts: [{ text: lastRawText }] },
        { role: "user", parts: [{ text: buildSchemaRepairPrompt(validation.errors ?? []) }] },
      );
    }

    throw new Error("Gemini extraction produced no valid document");
  }
}

type ParseResult =
  | { ok: true; value: GraphDocument }
  | { ok: false; reason: string };

function tryParseJson(text: string): ParseResult {
  // Strip markdown fence if present
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/.exec(text.trim());
  const candidate = fenced?.[1] ?? text;

  // Find outermost JSON object
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  const attempts = [candidate, start >= 0 && end > start ? candidate.slice(start, end + 1) : ""];
  for (const attempt of attempts) {
    if (attempt === "") continue;
    try {
      return { ok: true, value: JSON.parse(attempt) as GraphDocument };
    } catch (err) {
      // try next
    }
  }
  return { ok: false, reason: `no parseable JSON object found in response (length: ${text.length})` };
}
