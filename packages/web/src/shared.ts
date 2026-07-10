import type { AccountStatus, CheckResult } from "core/src/types";

export interface WebCheckLimits {
  maxUsernames: number;
  maxChecksPerRequest: number;
  maxConcurrency: number;
  maxTimeoutMs: number;
}

export const WEB_CHECK_LIMITS: WebCheckLimits = {
  maxUsernames: 10,
  maxChecksPerRequest: 50,
  maxConcurrency: 6,
  maxTimeoutMs: 30_000,
};

export const ACCOUNT_STATUSES = [
  "found",
  "not_found",
  "invalid",
  "blocked",
  "unknown",
  "error",
] as const satisfies readonly AccountStatus[];

export interface SiteSummary {
  id: string;
  name: string;
  tags: string[];
}

export interface SitesResponse {
  sites: SiteSummary[];
  defaults: {
    concurrency: number;
    timeoutMs: number;
  };
  limits: WebCheckLimits;
}

export interface CheckRequest {
  usernames: string[];
  siteIds: string[];
  concurrency?: number;
  timeoutMs?: number;
}

export interface CheckResponse {
  schemaVersion: 1;
  generatedAt: string;
  usernames: string[];
  sites: SiteSummary[];
  results: CheckResult[];
  summary: Record<AccountStatus, number>;
  totalChecks: number;
}

export const CHECK_STREAM_CONTENT_TYPE = "application/x-ndjson";

export type CheckStreamEvent =
  | {
      type: "result";
      completedChecks: number;
      result: CheckResult;
      totalChecks: number;
    }
  | {
      type: "complete";
      report: CheckResponse;
    }
  | {
      type: "error";
      error: string;
    };

export interface ApiErrorResponse {
  error: string;
}

export function createEmptySummary(): Record<AccountStatus, number> {
  return Object.fromEntries(ACCOUNT_STATUSES.map((status) => [status, 0])) as Record<
    AccountStatus,
    number
  >;
}

export function summarizeResults(results: CheckResult[]): Record<AccountStatus, number> {
  const summary = createEmptySummary();
  for (const result of results) {
    summary[result.status] += 1;
  }
  return summary;
}
