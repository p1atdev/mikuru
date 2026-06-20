/** @jsxImportSource react */

import { Badge, Meter, Text } from "@cloudflare/kumo";
import { ACCOUNT_STATUSES, type CheckResponse } from "../../shared";
import { statusBadgeVariant, statusLabel } from "../lib/status";

interface SummaryStripProps {
  report: CheckResponse;
}

export function SummaryStrip({ report }: SummaryStripProps) {
  const completed = report.results.length;

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

      <Meter
        customValue={`${completed} / ${report.totalChecks}`}
        label="Completed checks"
        max={Math.max(report.totalChecks, 1)}
        value={completed}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {ACCOUNT_STATUSES.map((status) => (
          <Badge appearance="dot" key={status} variant={statusBadgeVariant(status)}>
            {statusLabel(status)} {report.summary[status]}
          </Badge>
        ))}
      </div>
    </section>
  );
}
