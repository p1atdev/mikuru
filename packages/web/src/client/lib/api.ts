import {
  type ApiErrorResponse,
  type CheckRequest,
  type CheckResponse,
  type SitesResponse,
  WEB_CHECK_LIMITS,
  summarizeResults,
} from "../../shared";

export async function fetchSites(): Promise<SitesResponse> {
  const response = await fetch("/api/sites", {
    headers: {
      accept: "application/json",
    },
  });
  return readApiResponse<SitesResponse>(response);
}

export async function runCheck(request: CheckRequest): Promise<CheckResponse> {
  const siteBatches = batchSiteIds(request);
  if (siteBatches.length > 1) {
    const responses: CheckResponse[] = [];
    for (const siteIds of siteBatches) {
      responses.push(
        await runSingleCheck({
          ...request,
          siteIds,
        }),
      );
    }
    return mergeCheckResponses(responses, request);
  }
  return runSingleCheck(request);
}

async function runSingleCheck(request: CheckRequest): Promise<CheckResponse> {
  const response = await fetch("/api/check", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });
  return readApiResponse<CheckResponse>(response);
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
  const usernameOrder = new Map(request.usernames.map((username, index) => [username, index]));
  const siteOrder = new Map(request.siteIds.map((siteId, index) => [siteId, index]));
  const results = responses
    .flatMap((response) => response.results)
    .sort(
      (left, right) =>
        (usernameOrder.get(left.username) ?? Number.MAX_SAFE_INTEGER) -
          (usernameOrder.get(right.username) ?? Number.MAX_SAFE_INTEGER) ||
        (siteOrder.get(left.site.id) ?? Number.MAX_SAFE_INTEGER) -
          (siteOrder.get(right.site.id) ?? Number.MAX_SAFE_INTEGER),
    );

  return {
    schemaVersion: 1,
    generatedAt: responses.at(-1)?.generatedAt ?? new Date().toISOString(),
    usernames: request.usernames,
    sites: responses.flatMap((response) => response.sites),
    results,
    summary: summarizeResults(results),
    totalChecks: responses.reduce((total, response) => total + response.totalChecks, 0),
  };
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
