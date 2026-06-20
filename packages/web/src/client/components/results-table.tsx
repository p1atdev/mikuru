/** @jsxImportSource react */

import { Empty, LayerCard, Table, Text } from "@cloudflare/kumo";
import type { CheckResult } from "core/src/types";
import type { CheckResponse } from "../../shared";
import { StatusBadge } from "./status-badge";

interface ResultsTableProps {
  includeAll: boolean;
  report?: CheckResponse;
}

export function ResultsTable({ includeAll, report }: ResultsTableProps) {
  if (!report) {
    return (
      <LayerCard className="p-6">
        <Empty
          description="Enter one or more usernames and run a check to see matching profiles."
          title="No search has run"
        />
      </LayerCard>
    );
  }

  const results = includeAll
    ? report.results
    : report.results.filter((result) => result.status === "found");

  if (results.length === 0) {
    return (
      <LayerCard className="p-6">
        <Empty
          description="No result matched the current visibility setting."
          title="No accounts found"
        />
      </LayerCard>
    );
  }

  return (
    <LayerCard className="overflow-hidden p-0">
      <div className="border-b border-kumo-hairline p-4">
        <Text as="h2" variant="heading3">
          Results
        </Text>
        <Text size="sm" variant="secondary">
          Showing {results.length} of {report.results.length} checks.
        </Text>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Username</Table.Head>
              <Table.Head>Site</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Profile</Table.Head>
              <Table.Head>Detail</Table.Head>
              <Table.Head>Duration</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {results.map((result) => (
              <Table.Row key={resultKey(result)}>
                <Table.Cell>
                  <Text variant="mono">{result.username}</Text>
                </Table.Cell>
                <Table.Cell>{result.site.name}</Table.Cell>
                <Table.Cell>
                  <StatusBadge status={result.status} />
                </Table.Cell>
                <Table.Cell>
                  {result.status === "found" ? (
                    <a
                      className="break-all text-kumo-link hover:underline"
                      href={result.profileUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {result.profileUrl}
                    </a>
                  ) : (
                    <span className="text-kumo-subtle">-</span>
                  )}
                </Table.Cell>
                <Table.Cell className="max-w-[20rem]">
                  <span className="line-clamp-2">{resultDetail(result) || "-"}</span>
                </Table.Cell>
                <Table.Cell>{formatDuration(result.durationMs)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </LayerCard>
  );
}

function resultKey(result: CheckResult): string {
  return `${result.username}:${result.site.id}:${result.checkedAt}`;
}

function resultDetail(result: CheckResult): string {
  return (
    result.error ??
    result.evidence?.reason ??
    (result.httpStatus ? `HTTP ${result.httpStatus}` : "")
  );
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`;
  }
  return `${(durationMs / 1_000).toFixed(1)}s`;
}
