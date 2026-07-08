/** @jsxImportSource react */

import { Banner, Button, Checkbox, Input, InputArea, LayerCard, Text } from "@cloudflare/kumo";
import type { FormEvent } from "react";
import type { SiteSummary, WebCheckLimits } from "../../shared";
import { SitePicker } from "./site-picker";

interface SearchFormProps {
  checking: boolean;
  concurrency: string;
  defaults?: {
    concurrency: number;
    timeoutMs: number;
  };
  disabled?: boolean;
  formError?: string;
  includeAll: boolean;
  limits: WebCheckLimits;
  plannedChecks: number;
  selectedSiteIds: string[];
  sites: SiteSummary[];
  timeoutMs: string;
  usernameText: string;
  onConcurrencyChange: (value: string) => void;
  onIncludeAllChange: (value: boolean) => void;
  onSelectedSiteIdsChange: (siteIds: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTimeoutMsChange: (value: string) => void;
  onUsernameTextChange: (value: string) => void;
}

export function SearchForm({
  checking,
  concurrency,
  defaults,
  disabled = false,
  formError,
  includeAll,
  limits,
  plannedChecks,
  selectedSiteIds,
  sites,
  timeoutMs,
  usernameText,
  onConcurrencyChange,
  onIncludeAllChange,
  onSelectedSiteIdsChange,
  onSubmit,
  onTimeoutMsChange,
  onUsernameTextChange,
}: SearchFormProps) {
  const batchCount = Math.max(1, Math.ceil(plannedChecks / limits.maxChecksPerRequest));

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <LayerCard className="space-y-5 p-5">
        <div>
          <Text as="h2" variant="heading2">
            Check usernames
          </Text>
          <Text size="sm" variant="secondary">
            Search public profiles across Mikuru&apos;s enabled site manifest.
          </Text>
        </div>

        {formError ? (
          <Banner description={formError} title="Cannot run check" variant="error" />
        ) : null}

        <InputArea
          disabled={disabled || checking}
          label="Usernames"
          onChange={(event) => onUsernameTextChange(event.currentTarget.value)}
          placeholder={"torvalds\noctocat"}
          rows={5}
          value={usernameText}
        />

        <div className="flex flex-col gap-3 rounded-lg border border-kumo-hairline bg-kumo-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
          <Text size="sm" variant="secondary">
            {plannedChecks} planned checks
            {batchCount > 1 ? ` across ${batchCount} requests` : ""}
          </Text>
          <Button
            disabled={disabled || checking}
            loading={checking}
            type="submit"
            variant="primary"
          >
            Run check
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 [&_input]:min-w-0 [&_input]:w-full">
            <Input
              disabled={disabled || checking}
              inputMode="numeric"
              label="Concurrency"
              onChange={(event) => onConcurrencyChange(event.currentTarget.value)}
              placeholder={defaults ? String(defaults.concurrency) : undefined}
              value={concurrency}
            />
          </div>
          <div className="min-w-0 [&_input]:min-w-0 [&_input]:w-full">
            <Input
              disabled={disabled || checking}
              inputMode="numeric"
              label="Timeout ms"
              onChange={(event) => onTimeoutMsChange(event.currentTarget.value)}
              placeholder={defaults ? String(defaults.timeoutMs) : undefined}
              value={timeoutMs}
            />
          </div>
        </div>

        <Checkbox
          checked={includeAll}
          disabled={disabled || checking}
          label="Show non-matches and inconclusive results"
          onCheckedChange={(checked) => onIncludeAllChange(Boolean(checked))}
        />

        <SitePicker
          disabled={disabled || checking}
          onSelectedSiteIdsChange={onSelectedSiteIdsChange}
          selectedSiteIds={selectedSiteIds}
          sites={sites}
        />

        <div className="border-t border-kumo-hairline" />
      </LayerCard>
    </form>
  );
}
