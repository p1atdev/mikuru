import {
  CHECK_STREAM_CONTENT_TYPE,
  type ApiErrorResponse,
  type CheckRequest,
  type CheckResponse,
  type CheckStreamEvent,
  type SitesResponse,
  WEB_CHECK_LIMITS,
  summarizeResults,
} from "../../shared";
import type { CheckResult } from "core/src/types";

export interface CheckProgress {
  completedBatches: number;
  completedChecks: number;
  currentBatch: number;
  report?: CheckResponse;
  totalBatches: number;
  totalChecks: number;
}

export interface RunCheckOptions {
  fetcher?: typeof fetch;
  onProgress?: (progress: CheckProgress) => void;
  signal?: AbortSignal;
}

export async function fetchSites(): Promise<SitesResponse> {
  const response = await fetch("/api/sites", {
    headers: {
      accept: "application/json",
    },
  });
  return readApiResponse<SitesResponse>(response);
}

export async function runCheck(
  request: CheckRequest,
  options: RunCheckOptions = {},
): Promise<CheckResponse> {
  const siteBatches = batchSiteIds(request);
  const batches = siteBatches.length > 0 ? siteBatches : [request.siteIds];
  const fetcher = options.fetcher ?? fetch;
  const responses: CheckResponse[] = [];
  const streamedResults: CheckResult[] = [];
  const totalChecks = request.usernames.length * request.siteIds.length;

  options.onProgress?.({
    completedBatches: 0,
    completedChecks: 0,
    currentBatch: 1,
    totalBatches: batches.length,
    totalChecks,
  });

  for (const [index, siteIds] of batches.entries()) {
    options.signal?.throwIfAborted();
    const batchReport = await runSingleCheck(
      {
        ...request,
        siteIds,
      },
      fetcher,
      options.signal,
      (event) => {
        streamedResults.push(event.result);
        options.onProgress?.({
          completedBatches: index + (event.completedChecks === event.totalChecks ? 1 : 0),
          completedChecks: streamedResults.length,
          currentBatch: index + 1,
          report: createPartialCheckResponse(streamedResults, request),
          totalBatches: batches.length,
          totalChecks,
        });
      },
    );
    responses.push(batchReport);
  }

  return mergeCheckResponses(responses, request);
}

async function runSingleCheck(
  request: CheckRequest,
  fetcher: typeof fetch,
  signal?: AbortSignal,
  onResult?: (event: Extract<CheckStreamEvent, { type: "result" }>) => void,
): Promise<CheckResponse> {
  const response = await fetcher("/api/check", {
    method: "POST",
    headers: {
      accept: CHECK_STREAM_CONTENT_TYPE,
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    return readApiResponse<CheckResponse>(response);
  }

  const contentType = response.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== CHECK_STREAM_CONTENT_TYPE) {
    throw new Error(`Expected ${CHECK_STREAM_CONTENT_TYPE} from ${response.url || "/api/check"}.`);
  }

  return readCheckStream(response, signal, onResult);
}

function batchSiteIds(request: CheckRequest): string[][] {
  if (request.usernames.length === 0) {
    return [request.siteIds];
  }
  const maxSitesPerRequest = Math.max(
    1,
    Math.floor(WEB_CHECK_LIMITS.maxChecksPerRequest / request.usernames.length),
  );
  const batches: string[][] = [];
  for (let index = 0; index < request.siteIds.length; index += maxSitesPerRequest) {
    batches.push(request.siteIds.slice(index, index + maxSitesPerRequest));
  }
  return batches;
}

function mergeCheckResponses(responses: CheckResponse[], request: CheckRequest): CheckResponse {
  const results = sortResults(
    responses.flatMap((response) => response.results),
    request,
  );

  return {
    schemaVersion: 1,
    generatedAt: responses.at(-1)?.generatedAt ?? new Date().toISOString(),
    usernames: request.usernames,
    sites: responses.flatMap((response) => response.sites),
    results,
    summary: summarizeResults(results),
    totalChecks: request.usernames.length * request.siteIds.length,
  };
}

function createPartialCheckResponse(
  streamedResults: CheckResult[],
  request: CheckRequest,
): CheckResponse {
  const results = sortResults([...streamedResults], request);
  const completedSites = new Map(
    results.map((result) => [
      result.site.id,
      { id: result.site.id, name: result.site.name, tags: [] },
    ]),
  );

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    usernames: request.usernames,
    sites: request.siteIds.flatMap((siteId) => {
      const site = completedSites.get(siteId);
      return site ? [site] : [];
    }),
    results,
    summary: summarizeResults(results),
    totalChecks: request.usernames.length * request.siteIds.length,
  };
}

function sortResults(results: CheckResult[], request: CheckRequest): CheckResult[] {
  const usernameOrder = new Map(request.usernames.map((username, index) => [username, index]));
  const siteOrder = new Map(request.siteIds.map((siteId, index) => [siteId, index]));
  return results.sort(
    (left, right) =>
      (usernameOrder.get(left.username) ?? Number.MAX_SAFE_INTEGER) -
        (usernameOrder.get(right.username) ?? Number.MAX_SAFE_INTEGER) ||
      (siteOrder.get(left.site.id) ?? Number.MAX_SAFE_INTEGER) -
        (siteOrder.get(right.site.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

async function readCheckStream(
  response: Response,
  signal?: AbortSignal,
  onResult?: (event: Extract<CheckStreamEvent, { type: "result" }>) => void,
): Promise<CheckResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(`Response stream was missing for ${response.url || "/api/check"}.`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let report: CheckResponse | undefined;

  const consumeLine = (line: string) => {
    const event = parseCheckStreamEvent(line);
    switch (event.type) {
      case "result":
        onResult?.(event);
        signal?.throwIfAborted();
        break;
      case "complete":
        report = event.report;
        break;
      case "error":
        throw new Error(event.error);
    }
  };

  while (true) {
    signal?.throwIfAborted();
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        consumeLine(line);
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    consumeLine(buffer.trim());
  }

  if (!report) {
    throw new Error(
      `Check stream ended without a complete event for ${response.url || "/api/check"}.`,
    );
  }
  return report;
}

function parseCheckStreamEvent(line: string): CheckStreamEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error("Check stream contained invalid JSON.");
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error("Check stream contained an invalid event.");
  }

  if (
    value.type === "result" &&
    Number.isInteger(value.completedChecks) &&
    Number.isInteger(value.totalChecks) &&
    isRecord(value.result)
  ) {
    return value as CheckStreamEvent;
  }
  if (value.type === "complete" && isRecord(value.report)) {
    return value as CheckStreamEvent;
  }
  if (value.type === "error" && typeof value.error === "string") {
    return value as CheckStreamEvent;
  }

  throw new Error("Check stream contained an invalid event.");
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      isApiErrorResponse(payload)
        ? payload.error
        : `Request failed with status ${response.status}.`,
    );
  }
  return payload as T;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(`Response was not valid JSON for ${response.url}.`);
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
