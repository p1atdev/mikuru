import type {
  AccountStatus,
  CheckResult,
  RunReport,
} from "./types.ts";

const STATUSES: AccountStatus[] = [
  "found",
  "not_found",
  "invalid",
  "blocked",
  "unknown",
  "error",
];

export function createReport(
  usernames: string[],
  results: CheckResult[],
  options: { includeAll?: boolean } = {},
): RunReport {
  const summary = Object.fromEntries(
    STATUSES.map((status) => [status, 0]),
  ) as Record<AccountStatus, number>;

  for (const result of results) {
    summary[result.status] += 1;
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    usernames,
    results: options.includeAll
      ? results
      : results.filter((result) => result.status === "found"),
    summary,
  };
}

export function formatJson(report: RunReport): string {
  return JSON.stringify(report, null, 2);
}

export function formatJsonLines(report: RunReport): string {
  return [
    ...report.results.map((result) =>
      JSON.stringify({ type: "result", ...result }),
    ),
    JSON.stringify({
      type: "summary",
      generatedAt: report.generatedAt,
      usernames: report.usernames,
      summary: report.summary,
    }),
  ].join("\n");
}

export function formatText(report: RunReport): string {
  const lines: string[] = [];
  let currentUsername = "";

  for (const result of report.results) {
    if (result.username !== currentUsername) {
      if (lines.length > 0) {
        lines.push("");
      }
      currentUsername = result.username;
      lines.push(currentUsername);
    }

    const status = result.status.toUpperCase().padEnd(9);
    const detail =
      result.status === "found" ? result.profileUrl : result.error ?? "";
    lines.push(`  ${status} ${result.site.name}${detail ? `  ${detail}` : ""}`);
  }

  const counts = STATUSES.filter((status) => report.summary[status] > 0)
    .map((status) => `${status}=${report.summary[status]}`)
    .join(" ");
  if (report.results.length === 0) {
    lines.push("No accounts found.");
  }
  lines.push("", `Summary: ${counts || "no results"}`);
  return lines.join("\n");
}
