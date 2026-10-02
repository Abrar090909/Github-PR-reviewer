import { expect, test } from "vitest";
import { parseRemoteUrl, parseRepoSlug } from "../src/git.js";

test.each([
  ["git@github.com:Abrar090909/Github-PR-reviewer.git", "Abrar090909", "Github-PR-reviewer", "github.com"],
  ["https://github.com/Abrar090909/Github-PR-reviewer.git", "Abrar090909", "Github-PR-reviewer", "github.com"],
  ["https://github.com/Abrar090909/Github-PR-reviewer", "Abrar090909", "Github-PR-reviewer", "github.com"],
  ["ssh://git@github.com:Abrar090909/Github-PR-reviewer.git", "Abrar090909", "Github-PR-reviewer", "github.com"],
  ["https://gitlab.example.com/team/group/app.git", "team/group", "app", "gitlab.example.com"],
])("%s names a repository", (url, owner, name, host) => {
  expect(parseRemoteUrl(url)).toEqual({ owner, name, host });
});

test("a remote that names no repository is not guessed at", () => {
  expect(parseRemoteUrl("/srv/git/bare-repo")).toBeUndefined();
});

test("--repo-slug takes owner/name and nothing longer", () => {
  expect(parseRepoSlug("Abrar090909/Github-PR-reviewer")).toEqual({
    owner: "Abrar090909",
    name: "Github-PR-reviewer",
    host: "github.com",
  });
  expect(parseRepoSlug("contour")).toBeUndefined();
  expect(parseRepoSlug("a/b/c")).toBeUndefined();
});
