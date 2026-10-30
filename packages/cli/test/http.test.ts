import { afterEach, expect, test, vi } from "vitest";
import { PrLensCliError } from "../src/errors.js";
import { postJson } from "../src/providers/http.js";

const URL = "https://provider.test/v1/generate";
const NO_WAIT = [0, 0, 0];

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });

const answering = (...replies: Response[]) => {
  const fetch = vi.fn(async () => replies.shift() ?? reply(500, "no more replies scripted"));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("a provider under high demand is asked again, and its answer is used", async () => {
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const fetch = answering(reply(503, { error: { status: "UNAVAILABLE" } }), reply(429, "slow down"), reply(200, { ok: true }));

  await expect(postJson(URL, {}, {}, NO_WAIT)).resolves.toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("a provider that stays unavailable fails with its last answer, after the retries run out", async () => {
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const fetch = answering(...Array.from({ length: 4 }, () => reply(503, "still busy")));

  const failure = await postJson(URL, {}, {}, NO_WAIT).catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(PrLensCliError);
  expect((failure as PrLensCliError).message).toContain("503");
  expect(fetch).toHaveBeenCalledTimes(4);
});

test("a bad key is not retried, because asking again cannot fix it", async () => {
  const fetch = answering(reply(401, "invalid key"));

  await expect(postJson(URL, {}, {}, NO_WAIT)).rejects.toThrow("401");
  expect(fetch).toHaveBeenCalledTimes(1);
});
