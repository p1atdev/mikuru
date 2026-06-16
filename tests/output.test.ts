import { expect, test } from "bun:test";
import { createReport, formatJsonLines, formatRichText, formatText } from "../src/output.ts";
import type { CheckResult } from "../src/types.ts";

const result: CheckResult = {
  username: "alice",
  site: { id: "example", name: "Example" },
  status: "found",
  profileUrl: "https://example.com/alice",
  durationMs: 1,
  checkedAt: "2026-01-01T00:00:00.000Z",
};

test("creates agent-readable reports containing found accounts", () => {
  const report = createReport(["alice"], [result]);

  expect(report.summary.found).toBe(1);
  expect(JSON.parse(formatJsonLines(report).split("\n")[0]!)).toMatchObject({
    type: "result",
    username: "alice",
    status: "found",
  });
  expect(formatText(report)).toContain("https://example.com/alice");
});

test("omits non-matches unless includeAll is enabled", () => {
  const notFound: CheckResult = {
    ...result,
    status: "not_found",
    profileUrl: "https://example.com/missing",
  };

  const defaultReport = createReport(["alice"], [notFound]);
  expect(defaultReport.results).toEqual([]);
  expect(defaultReport.summary.not_found).toBe(1);
  expect(formatText(defaultReport)).toContain("No accounts found.");

  const fullReport = createReport(["alice"], [notFound], {
    includeAll: true,
  });
  expect(fullReport.results).toEqual([notFound]);
});

test("plain text output keeps errors and rule reasons", () => {
  const error: CheckResult = {
    ...result,
    status: "error",
    error: "Request timed out after 1000ms",
  };
  const blocked: CheckResult = {
    ...result,
    site: { id: "blocked", name: "Blocked" },
    status: "blocked",
    evidence: {
      rule: 1,
      result: "blocked",
      reason: "Cloudflare challenge page",
    },
  };
  const report = createReport(["alice"], [error, blocked], {
    includeAll: true,
  });

  const output = formatText(report);

  expect(output).toContain("Request timed out after 1000ms");
  expect(output).toContain("Cloudflare challenge page");
});

test("rich text output keeps errors and rule reasons in details", () => {
  const blocked: CheckResult = {
    ...result,
    status: "blocked",
    evidence: {
      rule: 1,
      result: "blocked",
      reason: "Cloudflare challenge page",
    },
  };
  const report = createReport(["alice"], [blocked], {
    includeAll: true,
  });

  expect(formatRichText(report, { colors: false, width: 80 })).toContain(
    "Cloudflare challenge page",
  );
});

test("formats rich terminal reports with tables and full summary counts", () => {
  const notFound: CheckResult = {
    ...result,
    status: "not_found",
    profileUrl: "https://example.com/missing",
  };
  const report = createReport(["alice"], [result, notFound]);

  const output = formatRichText(report, { colors: false, width: 80 });

  expect(output).toContain("Status");
  expect(output).toContain("FOUND");
  expect(output).toContain("https://example.com/alice");
  expect(output).toContain("Summary");
  expect(output).toContain("NOT_FOUND");
});
