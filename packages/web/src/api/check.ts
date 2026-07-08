import type { Hono } from "hono";
import { checkUsernames } from "core/src/core/check";
import type { LoadedManifest, SiteConfig } from "core/src/types";
import {
  type ApiErrorResponse,
  type CheckRequest,
  type CheckResponse,
  WEB_CHECK_LIMITS,
  summarizeResults,
} from "../shared";
import { enabledSites, siteSummaries, webDefaultConcurrency, webDefaultTimeoutMs } from "./sites";

export function registerCheckApi(app: Hono, manifest: LoadedManifest): void {
  app.post("/api/check", async (c) => {
    const input = parseCheckRequest(await readJson(c.req.raw));
    if (!input.ok) {
      return c.json<ApiErrorResponse>({ error: input.error }, 400);
    }

    const sites = selectedSites(input.value.siteIds, manifest);
    if (!sites.ok) {
      return c.json<ApiErrorResponse>({ error: sites.error }, 400);
    }

    const plan = validateCheckPlan(input.value.usernames, sites.value.length);
    if (!plan.ok) {
      return c.json<ApiErrorResponse>({ error: plan.error }, 400);
    }

    const results = await checkUsernames(input.value.usernames, sites.value, manifest, {
      concurrency: input.value.concurrency ?? webDefaultConcurrency(manifest),
      timeoutMs: input.value.timeoutMs ?? webDefaultTimeoutMs(manifest),
    });

    return c.json<CheckResponse>({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      usernames: input.value.usernames,
      sites: siteSummaries(sites.value),
      results,
      summary: summarizeResults(results),
      totalChecks: input.value.usernames.length * sites.value.length,
    });
  });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function parseCheckRequest(
  input: unknown,
): { ok: true; value: CheckRequest } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  if (!Array.isArray(input.usernames)) {
    return { ok: false, error: "usernames must be an array of strings." };
  }
  const usernames = normalizedStringList(input.usernames);
  if (usernames.length === 0) {
    return { ok: false, error: "At least one username is required." };
  }
  if (usernames.length > WEB_CHECK_LIMITS.maxUsernames) {
    return {
      ok: false,
      error: `usernames must include at most ${WEB_CHECK_LIMITS.maxUsernames} entries.`,
    };
  }

  if (!Array.isArray(input.siteIds)) {
    return { ok: false, error: "siteIds must be an array of strings." };
  }
  const siteIds = normalizedStringList(input.siteIds);
  if (siteIds.length === 0) {
    return { ok: false, error: "At least one site is required." };
  }

  const concurrency = optionalPositiveInteger(
    input.concurrency,
    "concurrency",
    WEB_CHECK_LIMITS.maxConcurrency,
  );
  if (!concurrency.ok) {
    return concurrency;
  }

  const timeoutMs = optionalPositiveInteger(
    input.timeoutMs,
    "timeoutMs",
    WEB_CHECK_LIMITS.maxTimeoutMs,
  );
  if (!timeoutMs.ok) {
    return timeoutMs;
  }

  return {
    ok: true,
    value: {
      usernames,
      siteIds,
      concurrency: concurrency.value,
      timeoutMs: timeoutMs.value,
    },
  };
}

function selectedSites(
  siteIds: string[],
  manifest: LoadedManifest,
): { ok: true; value: SiteConfig[] } | { ok: false; error: string } {
  const requested = new Set(siteIds.map((siteId) => siteId.toLocaleLowerCase()));
  const sites = enabledSites(manifest).filter(
    (site) =>
      requested.has(site.id.toLocaleLowerCase()) || requested.has(site.name.toLocaleLowerCase()),
  );
  const matched = new Set(
    sites.flatMap((site) => [site.id.toLocaleLowerCase(), site.name.toLocaleLowerCase()]),
  );
  const missing = [...requested].filter((siteId) => !matched.has(siteId));

  if (missing.length > 0) {
    return { ok: false, error: `Unknown enabled sites: ${missing.join(", ")}` };
  }
  if (sites.length === 0) {
    return { ok: false, error: "At least one enabled site is required." };
  }
  return { ok: true, value: sites };
}

function validateCheckPlan(
  usernames: string[],
  siteCount: number,
): { ok: true } | { ok: false; error: string } {
  const totalChecks = usernames.length * siteCount;
  if (totalChecks > WEB_CHECK_LIMITS.maxChecksPerRequest) {
    return {
      ok: false,
      error: `A single request can include at most ${WEB_CHECK_LIMITS.maxChecksPerRequest} checks.`,
    };
  }
  return { ok: true };
}

function normalizedStringList(input: unknown[]): string[] {
  return [
    ...new Set(
      input
        .filter(isString)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function optionalPositiveInteger(
  value: unknown,
  name: string,
  max: number,
): { ok: true; value: number | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return { ok: false, error: `${name} must be a positive integer.` };
  }
  if (value > max) {
    return { ok: false, error: `${name} must be at most ${max}.` };
  }
  return { ok: true, value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
