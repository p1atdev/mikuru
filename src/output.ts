import { Table } from "@cliffy/table";
import type { AccountStatus, CheckResult, RunReport } from "./types.ts";

const STATUSES: AccountStatus[] = ["found", "not_found", "invalid", "blocked", "unknown", "error"];
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

export function createReport(
  usernames: string[],
  results: CheckResult[],
  options: { includeAll?: boolean } = {},
): RunReport {
  const summary = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
    AccountStatus,
    number
  >;

  for (const result of results) {
    summary[result.status] += 1;
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    usernames,
    results: options.includeAll ? results : results.filter((result) => result.status === "found"),
    summary,
  };
}

export function formatJson(report: RunReport): string {
  return JSON.stringify(report, null, 2);
}

export function formatJsonLines(report: RunReport): string {
  return [
    ...report.results.map((result) => JSON.stringify({ type: "result", ...result })),
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
    const detail = result.status === "found" ? result.profileUrl : (result.error ?? "");
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

export function formatRichText(
  report: RunReport,
  options: { colors?: boolean; width?: number } = {},
): string {
  const colors = options.colors ?? true;
  const width = options.width ?? 100;
  const lines: string[] = [];
  const grouped = groupResultsByUsername(report.results);

  for (const username of report.usernames) {
    const results = grouped.get(username);
    if (!results || results.length === 0) {
      continue;
    }

    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(style(username, ANSI.bold, colors));
    lines.push(resultTable(results, colors, width));
  }

  if (report.results.length === 0) {
    lines.push("No accounts found.");
  }

  lines.push("", style("Summary", ANSI.bold, colors), summaryTable(report, colors, width));
  return lines.join("\n");
}

function groupResultsByUsername(results: CheckResult[]): Map<string, CheckResult[]> {
  const grouped = new Map<string, CheckResult[]>();
  for (const result of results) {
    const entries = grouped.get(result.username) ?? [];
    entries.push(result);
    grouped.set(result.username, entries);
  }
  return grouped;
}

function resultTable(results: CheckResult[], colors: boolean, width: number): string {
  return new Table()
    .header(["Status", "Site", "Profile", "Detail"])
    .body(
      results.map((result) => [
        formatStatus(result.status, colors),
        result.site.name,
        result.status === "found" ? result.profileUrl : "",
        result.error ?? result.evidence?.reason ?? "",
      ]),
    )
    .maxWidth(width)
    .toString();
}

function summaryTable(report: RunReport, colors: boolean, width: number): string {
  return new Table()
    .header(["Status", "Count"])
    .body(
      STATUSES.filter((status) => report.summary[status] > 0).map((status) => [
        formatStatus(status, colors),
        String(report.summary[status]),
      ]),
    )
    .maxWidth(Math.min(width, 48))
    .toString();
}

function formatStatus(status: AccountStatus, colors: boolean): string {
  const label = status.toUpperCase();
  switch (status) {
    case "found":
      return style(label, ANSI.green, colors);
    case "not_found":
      return style(label, ANSI.dim, colors);
    case "invalid":
    case "blocked":
      return style(label, ANSI.yellow, colors);
    case "unknown":
      return style(label, ANSI.cyan, colors);
    case "error":
      return style(label, ANSI.red, colors);
  }
}

function style(value: string, code: string, enabled: boolean): string {
  return enabled ? `${code}${value}${ANSI.reset}` : value;
}
