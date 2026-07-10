import { expect, test } from "bun:test";
import type { CheckResult } from "core/src/types";
import { runCheck, type CheckProgress } from "../src/client/lib/api";
import {
  CHECK_STREAM_CONTENT_TYPE,
  summarizeResults,
  type CheckRequest,
  type CheckResponse,
  type CheckStreamEvent,
} from "../src/shared";

test("client check reports progress and merges batched responses", async () => {
  const siteIds = Array.from({ length: 51 }, (_value, index) => `site-${index}`);
  const requests: CheckRequest[] = [];
  const progress: CheckProgress[] = [];

  const report = await runCheck(
    {
      usernames: ["alice", "bob"],
      siteIds,
    },
    {
      fetcher: createCheckFetcher(requests),
      onProgress: (update) => progress.push(update),
    },
  );

  expect(requests.map((request) => request.siteIds.length)).toEqual([25, 25, 1]);
  expect(progress.map((update) => update.completedChecks)).toEqual(
    Array.from({ length: 103 }, (_value, index) => index),
  );
  expect(progress[50]?.completedBatches).toBe(1);
  expect(progress[51]?.completedBatches).toBe(1);
  expect(progress[100]?.completedBatches).toBe(2);
  expect(progress[101]?.completedBatches).toBe(2);
  expect(progress[102]?.completedBatches).toBe(3);
  expect(progress[50]?.currentBatch).toBe(1);
  expect(progress[51]?.currentBatch).toBe(2);
  expect(progress[101]?.currentBatch).toBe(3);
  expect(progress.every((update) => update.totalBatches === 3)).toBeTrue();
  expect(progress.every((update) => update.totalChecks === 102)).toBeTrue();
  expect(report.totalChecks).toBe(102);
  expect(report.results).toHaveLength(102);
  expect(report.results[0]).toMatchObject({ username: "alice", site: { id: "site-0" } });
  expect(report.results[51]).toMatchObject({ username: "bob", site: { id: "site-0" } });
});

test("client check stops before the next batch when cancelled", async () => {
  const abortController = new AbortController();
  const requests: CheckRequest[] = [];
  const progress: CheckProgress[] = [];

  const promise = runCheck(
    {
      usernames: ["alice"],
      siteIds: Array.from({ length: 51 }, (_value, index) => `site-${index}`),
    },
    {
      fetcher: createCheckFetcher(requests),
      onProgress: (update) => {
        progress.push(update);
        if (update.completedChecks === 1) {
          abortController.abort();
        }
      },
      signal: abortController.signal,
    },
  );

  await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  expect(requests).toHaveLength(1);
  expect(progress.at(-1)?.completedChecks).toBe(1);
  expect(progress.at(-1)?.report?.results).toHaveLength(1);
});

function createCheckFetcher(requests: CheckRequest[]): typeof fetch {
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as CheckRequest;
    requests.push(request);
    const report = createResponse(request);
    const events: CheckStreamEvent[] = [
      ...report.results.map(
        (result, index): CheckStreamEvent => ({
          type: "result",
          completedChecks: index + 1,
          result,
          totalChecks: report.results.length,
        }),
      ),
      { type: "complete", report },
    ];

    return new Response(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`, {
      headers: { "content-type": CHECK_STREAM_CONTENT_TYPE },
    });
  }) as typeof fetch;
}

function createResponse(request: CheckRequest): CheckResponse {
  const checkedAt = "2026-07-10T00:00:00.000Z";
  const results: CheckResult[] = request.usernames.flatMap((username) =>
    request.siteIds.map((siteId) => ({
      username,
      site: {
        id: siteId,
        name: siteId,
      },
      status: "found",
      profileUrl: `https://example.com/${siteId}/${username}`,
      durationMs: 10,
      checkedAt,
    })),
  );

  return {
    schemaVersion: 1,
    generatedAt: checkedAt,
    usernames: request.usernames,
    sites: request.siteIds.map((siteId) => ({ id: siteId, name: siteId, tags: [] })),
    results,
    summary: summarizeResults(results),
    totalChecks: results.length,
  };
}
