import { setTimeout as sleep } from "node:timers/promises";
import { PrLensCliError } from "../errors.js";

/** Long enough for a reasoning model on a large diff, short enough to fail a stuck CI job. */
const REQUEST_TIMEOUT_MS = 300_000;

const MAX_ERROR_BODY_CHARS = 600;

/**
 * Providers shed load with 429 and 5xx ("the model is experiencing high
 * demand"), and that usually clears within seconds. A CI run should ride it
 * out rather than fail the pull request. Anything else, a bad key or a bad
 * request, will not improve on a second try.
 */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const MAX_RETRY_AFTER_MS = 30_000;

/** Honours a Retry-After in seconds, within reason; otherwise the schedule decides. */
const retryDelay = (response: Response, scheduled: number): number => {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS) : scheduled;
};

export const postJson = async (
  url: string,
  headers: Record<string, string>,
  body: unknown,
  retryDelaysMs: readonly number[] = RETRY_DELAYS_MS,
): Promise<unknown> => {
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new PrLensCliError(
        "PROVIDER_FAILED",
        `the request to ${url} did not complete`,
        error instanceof Error ? error.message : String(error),
      );
    });

  let response = await send();
  for (const scheduled of retryDelaysMs) {
    if (!RETRY_STATUSES.has(response.status)) break;
    const delay = retryDelay(response, scheduled);
    process.stderr.write(`${url} answered ${response.status}, trying again in ${Math.round(delay / 1_000)}s…\n`);
    await response.body?.cancel();
    await sleep(delay);
    response = await send();
  }

  const text = await response.text();

  if (!response.ok)
    throw new PrLensCliError(
      "PROVIDER_FAILED",
      `${url} answered ${response.status} ${response.statusText}`,
      text.slice(0, MAX_ERROR_BODY_CHARS),
    );

  try {
    return JSON.parse(text);
  } catch {
    throw new PrLensCliError(
      "PROVIDER_FAILED",
      `${url} answered with something that is not JSON`,
      text.slice(0, MAX_ERROR_BODY_CHARS),
    );
  }
};

export const cutOff = (provider: string): PrLensCliError =>
  new PrLensCliError(
    "PROVIDER_FAILED",
    `${provider} stopped before finishing the document`,
    "the answer hit the output token limit — raise --max-output-tokens, or narrow the diff with --base",
  );

export const unreadableResponse = (provider: string, detail: string): PrLensCliError =>
  new PrLensCliError("PROVIDER_FAILED", `${provider} returned no usable text`, detail);
