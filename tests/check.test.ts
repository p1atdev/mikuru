import { expect, test } from "bun:test";
import { parseManifest } from "../src/config/load.ts";
import { checkUsernames } from "../src/core/check.ts";

test("checkUsernames reports progress as each check completes", async () => {
  const manifest = parseManifest({
    version: 1,
    defaults: { concurrency: 2 },
    sites: [
      {
        id: "one",
        name: "One",
        profileUrl: "https://example.com/{username}",
        username: { pattern: "^valid$" },
        request: {},
        rules: [
          {
            result: "found",
            when: { all: [{ type: "status", in: [200] }] },
          },
        ],
      },
      {
        id: "two",
        name: "Two",
        profileUrl: "https://example.net/{username}",
        username: { pattern: "^valid$" },
        request: {},
        rules: [
          {
            result: "found",
            when: { all: [{ type: "status", in: [200] }] },
          },
        ],
      },
    ],
  });

  const progress: Array<{ completed: number; total: number }> = [];
  const results = await checkUsernames(["alice"], manifest.sites, manifest, {
    onResult: (_result, completed, total) => {
      progress.push({ completed, total });
    },
  });

  expect(results.map((result) => result.site.id)).toEqual(["one", "two"]);
  expect(results.every((result) => result.status === "invalid")).toBeTrue();
  expect(progress).toEqual([
    { completed: 1, total: 2 },
    { completed: 2, total: 2 },
  ]);
});
