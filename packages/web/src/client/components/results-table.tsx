/** @jsxImportSource react */

import { Empty, LayerCard, Table, Tabs, Text } from "@cloudflare/kumo";
import type { AccountStatus, CheckResult } from "core/src/types";
import type { CheckResponse } from "../../shared";
import { StatusBadge } from "./status-badge";

export type ResultView = "matches" | "review" | "all";

interface ResultsTableProps {
  onViewChange: (view: ResultView) => void;
  report?: CheckResponse;
  view: ResultView;
}

const REVIEW_STATUSES = new Set<AccountStatus>(["invalid", "blocked", "unknown", "error"]);

export function ResultsTable({ onViewChange, report, view }: ResultsTableProps) {
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

  const results = filterResults(report.results, view);
  const reviewCount = report.results.filter((result) => REVIEW_STATUSES.has(result.status)).length;
  const tabs = [
    { value: "matches", label: `Matches (${report.summary.found})` },
    { value: "review", label: `Needs review (${reviewCount})` },
    { value: "all", label: `All (${report.results.length})` },
  ];

  return (
    <LayerCard className="min-w-0 overflow-hidden p-0">
      <div className="space-y-3 border-b border-kumo-hairline p-4">
        <div>
          <Text as="h2" variant="heading3">
            Results
          </Text>
          <Text size="sm" variant="secondary">
            Showing {results.length} of {report.results.length} completed checks.
          </Text>
        </div>
        <Tabs
          activateOnFocus
          className="w-full max-w-full overflow-x-auto"
          listClassName="gap-5"
          onValueChange={(value) => onViewChange(value as ResultView)}
          tabs={tabs}
          value={view}
          variant="underline"
        />
      </div>

      {results.length === 0 ? (
        <div className="p-6">
          <Empty description={emptyDescription(view)} title={emptyTitle(view)} />
        </div>
      ) : (
        <>
          <div className="space-y-3 p-4 xl:hidden">
            {results.map((result) => (
              <ResultCard key={resultKey(result)} result={result} />
            ))}
          </div>

          <div className="hidden overflow-x-auto xl:block">
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
                    <Table.Cell className="max-w-[22rem]">
                      {result.status === "found" ? (
                        <ProfileLink result={result} />
                      ) : (
                        <span className="text-kumo-subtle">-</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="max-w-[20rem]">
                      <span className="line-clamp-2" title={resultDetail(result)}>
                        {resultDetail(result) || "-"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>{formatDuration(result.durationMs)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </>
      )}
    </LayerCard>
  );
}

function ResultCard({ result }: { result: CheckResult }) {
  const detail = resultDetail(result);

  return (
    <article className="space-y-3 rounded-lg border border-kumo-hairline bg-kumo-base p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text as="h3" variant="heading3">
            {result.site.name}
          </Text>
          <Text variant="mono-secondary">{result.username}</Text>
        </div>
        <StatusBadge status={result.status} />
      </div>

      {result.status === "found" ? <ProfileLink result={result} /> : null}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-kumo-subtle">Detail</dt>
        <dd className="min-w-0 break-words text-kumo-default">{detail || "-"}</dd>
        <dt className="text-kumo-subtle">Duration</dt>
        <dd className="text-kumo-default">{formatDuration(result.durationMs)}</dd>
      </dl>
    </article>
  );
}

function ProfileLink({ result }: { result: CheckResult }) {
  return (
    <a
      className="block min-h-8 max-w-[22rem] break-all rounded-md font-mono text-xs text-kumo-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      href={result.profileUrl}
      rel="noreferrer"
      target="_blank"
      title={result.profileUrl}
    >
      {result.profileUrl}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function filterResults(results: CheckResult[], view: ResultView): CheckResult[] {
  switch (view) {
    case "matches":
      return results.filter((result) => result.status === "found");
    case "review":
      return results.filter((result) => REVIEW_STATUSES.has(result.status));
    case "all":
      return results;
  }
}

function emptyTitle(view: ResultView): string {
  switch (view) {
    case "matches":
      return "No accounts found";
    case "review":
      return "Nothing needs review";
    case "all":
      return "No completed checks";
  }
}

function emptyDescription(view: ResultView): string {
  switch (view) {
    case "matches":
      return "No completed check found a matching public profile.";
    case "review":
      return "No completed check is blocked, invalid, unknown, or in error.";
    case "all":
      return "No result is available for this search yet.";
  }
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
