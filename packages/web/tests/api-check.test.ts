import { expect, test } from "bun:test";
import { Hono } from "hono";
import { parseManifest } from "core/src/config/load";
import { registerCheckApi } from "../src/api/check";
import { registerSitesApi } from "../src/api/sites";
import { WEB_CHECK_LIMITS, type ApiErrorResponse, type SitesResponse } from "../src/shared";

test("sites API exposes Worker-safe defaults and limits", async () => {
  const app = new Hono();
  registerSitesApi(
    app,
    parseManifest({
      version: 1,
      defaults: {
        concurrency: 16,
        timeoutMs: 60_000,
      },
      sites: [site("site-0")],
    }),
  );

  const response = await app.request("/api/sites");
  const payload = (await response.json()) as SitesResponse;

  expect(payload.defaults).toEqual({
    concurrency: WEB_CHECK_LIMITS.maxConcurrency,
    timeoutMs: WEB_CHECK_LIMITS.maxTimeoutMs,
  });
  expect(payload.limits).toEqual(WEB_CHECK_LIMITS);
});

test("check API rejects requests above Worker request limits", async () => {
  const app = new Hono();
  const manifest = parseManifest({
    version: 1,
    sites: Array.from({ length: WEB_CHECK_LIMITS.maxChecksPerRequest + 1 }, (_value, index) =>
      site(`site-${index}`),
    ),
  });
  registerCheckApi(app, manifest);

  const response = await postCheck(app, {
    usernames: ["alice"],
    siteIds: manifest.sites.map((entry) => entry.id),
  });
  const payload = (await response.json()) as ApiErrorResponse;

  expect(response.status).toBe(400);
  expect(payload.error).toContain(String(WEB_CHECK_LIMITS.maxChecksPerRequest));
});

test("check API rejects oversized usernames, concurrency, and timeout", async () => {
  const app = new Hono();
  registerCheckApi(
    app,
    parseManifest({
      version: 1,
      sites: [site("site-0")],
    }),
  );

  const tooManyUsernames = await postCheck(app, {
    usernames: Array.from(
      { length: WEB_CHECK_LIMITS.maxUsernames + 1 },
      (_value, index) => `alice${index}`,
    ),
    siteIds: ["site-0"],
  });
  expect(tooManyUsernames.status).toBe(400);

  const tooMuchConcurrency = await postCheck(app, {
    usernames: ["alice"],
    siteIds: ["site-0"],
    concurrency: WEB_CHECK_LIMITS.maxConcurrency + 1,
  });
  expect(tooMuchConcurrency.status).toBe(400);

  const tooMuchTimeout = await postCheck(app, {
    usernames: ["alice"],
    siteIds: ["site-0"],
    timeoutMs: WEB_CHECK_LIMITS.maxTimeoutMs + 1,
  });
  expect(tooMuchTimeout.status).toBe(400);
});

function postCheck(app: Hono, body: unknown): Promise<Response> {
  return app.request("/api/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function site(id: string) {
  return {
    id,
    name: id,
    profileUrl: `https://example.com/${id}/{username}`,
    request: {
      method: "HEAD" as const,
    },
    rules: [
      {
        result: "found" as const,
        when: {
          all: [{ type: "status" as const, in: [200] }],
        },
      },
    ],
  };
}
