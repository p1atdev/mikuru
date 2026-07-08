/** @jsxImportSource react */

import { Text } from "@cloudflare/kumo";
import { ACCOUNT_STATUSES, type CheckResponse } from "../../shared";
import { statusLabel, statusSegmentClass } from "../lib/status";
import { StatusBadge } from "./status-badge";

interface SummaryStripProps {
  report: CheckResponse;
}

export function SummaryStrip({ report }: SummaryStripProps) {
  const completed = report.results.length;
  const total = Math.max(report.totalChecks, 1);
  const segments = ACCOUNT_STATUSES.map((status) => ({
    status,
    count: report.summary[status],
  })).filter((segment) => segment.count > 0);
  const distributionLabel = ACCOUNT_STATUSES.map(
    (status) => `${statusLabel(status)} ${report.summary[status]}`,
  ).join(", ");

  return (
    <section
      aria-label="Check summary"
      className="rounded-lg border border-kumo-hairline bg-kumo-base p-4"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Text as="h2" variant="heading3">
            Summary
          </Text>
          <Text size="sm" variant="secondary">
            Generated at {new Date(report.generatedAt).toLocaleString()}
          </Text>
        </div>
        <Text variant="mono-secondary">
          {completed}/{report.totalChecks}
        </Text>
      </div>

      <div aria-label={`Result distribution: ${distributionLabel}`} role="img">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Text size="sm" variant="secondary">
            Result distribution
          </Text>
          <Text variant="mono-secondary">
            {completed}/{report.totalChecks}
          </Text>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-kumo-elevated">
          {segments.length > 0 ? (
            segments.map((segment) => (
              <div
                aria-label={`${statusLabel(segment.status)} ${segment.count}`}
                className={statusSegmentClass(segment.status)}
                key={segment.status}
                style={{ width: `${(segment.count / total) * 100}%` }}
                title={`${statusLabel(segment.status)} ${segment.count}`}
              />
            ))
          ) : (
            <div className="h-full w-full bg-kumo-line" />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ACCOUNT_STATUSES.map((status) => (
          <StatusBadge count={report.summary[status]} key={status} status={status} />
        ))}
      </div>
    </section>
  );
}
