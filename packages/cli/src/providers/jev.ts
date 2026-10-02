import { PrLensCliError } from "../errors.js";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 20_000;

export type JevReviewDecision = {
  kind: "advisory-review-decision";
  model: string;
  reviewProbability: number;
  recommendation: "request-human-review" | "standard-review";
  threshold: number;
  generatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const assessWithJev = async (
  apiKey: string,
  state: {
    title: string;
    summary: string;
    changedFiles: number;
    additions: number;
    deletions: number;
    nodes: Array<{ label: string; kind: string; delta: string }>;
    edgeCount: number;
  },
): Promise<JevReviewDecision> => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state,
      questions: {
        review_required: {
          type: "noul",
          instructions:
            "Based only on the supplied pull request summary and changed component metadata, would this change benefit from additional human review before merging? Return a high probability when the impact or uncertainty warrants careful review. This is an advisory signal, not a merge decision.",
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: unknown) => {
    throw new PrLensCliError(
      "PROVIDER_FAILED",
      "the request to Jev did not complete",
      error instanceof Error ? error.message : String(error),
    );
  });

  if (!response.ok)
    throw new PrLensCliError("PROVIDER_FAILED", `Jev answered ${response.status} ${response.statusText}`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PrLensCliError("PROVIDER_FAILED", "Jev returned a response that is not JSON");
  }

  if (!isRecord(body) || !isRecord(body.answers) || !isRecord(body.answers.review_required))
    throw new PrLensCliError("PROVIDER_FAILED", "Jev returned no review decision");

  const probability = body.answers.review_required.noul;
  if (typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1)
    throw new PrLensCliError("PROVIDER_FAILED", "Jev returned an invalid review probability");

  const threshold = 0.75;
  return {
    kind: "advisory-review-decision",
    model: typeof body.model === "string" ? body.model : "jev-latest",
    reviewProbability: probability,
    recommendation: probability >= threshold ? "request-human-review" : "standard-review",
    threshold,
    generatedAt: new Date().toISOString(),
  };
};
