import Anthropic from "@anthropic-ai/sdk";
import type { GraphDocument, AnalysisInput } from "@contour/shared";
import type { LLMProvider } from "./index.js";
import { SYSTEM_PROMPT, buildUserPrompt, buildJsonRepairPrompt, buildSchemaRepairPrompt } from "./index.js";
import { validateGraphDocument } from "../schema-validator.js";
import { logger } from "../logger.js";

const MAX_ATTEMPTS = 2;

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async analyze(input: AnalysisInput): Promise<GraphDocument> {
    logger.info({ provider: "anthropic", repo: input.repoFullName, pr: input.prNumber }, "Calling LLM");

    const userPrompt = buildUserPrompt(input);
    type MsgParam = Anthropic.MessageParam;
    const messages: MsgParam[] = [{ role: "user", content: userPrompt }];
    let lastRawText = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
      });

      const block = response.content[0];
      if (block?.type !== "text") throw new Error("Unexpected non-text response from Anthropic");
      lastRawText = block.text.trim();

      const doc = tryParseJson(lastRawText);
      if (!doc.ok) {
        if (attempt === MAX_ATTEMPTS) throw new Error(`Anthropic returned non-JSON: ${doc.reason}`);
        logger.warn({ attempt, reason: doc.reason }, "JSON parse failed — repairing");
        messages.push(
          { role: "assistant", content: lastRawText },
          { role: "user", content: buildJsonRepairPrompt(doc.reason) },
        );
        continue;
      }

      const validation = validateGraphDocument(doc.value);
      if (validation.valid) return doc.value;

      if (attempt === MAX_ATTEMPTS) {
        logger.error({ errors: validation.errors, provider: "anthropic" }, "Schema invalid after retries");
        throw new Error("Anthropic document invalid after retries");
      }

      logger.warn({ attempt, errors: validation.errors }, "Schema invalid — repairing");
      messages.push(
        { role: "assistant", content: lastRawText },
        { role: "user", content: buildSchemaRepairPrompt(validation.errors ?? []) },
      );
    }

    throw new Error("Anthropic extraction produced no valid document");
  }
}

type ParseResult =
  | { ok: true; value: GraphDocument }
  | { ok: false; reason: string };

function tryParseJson(text: string): ParseResult {
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/.exec(text.trim());
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const attempts = [candidate, start >= 0 && end > start ? candidate.slice(start, end + 1) : ""];
  for (const attempt of attempts) {
    if (attempt === "") continue;
    try { return { ok: true, value: JSON.parse(attempt) as GraphDocument }; } catch { /* next */ }
  }
  return { ok: false, reason: `no parseable JSON object found (length: ${text.length})` };
}
