/** @jsxImportSource react */

import { Banner, Button, Collapsible, Input, InputArea, LayerCard, Text } from "@cloudflare/kumo";
import type { FormEvent } from "react";
import { useState } from "react";
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
  limits: WebCheckLimits;
  plannedChecks: number;
  selectedSiteIds: string[];
  sites: SiteSummary[];
  timeoutMs: string;
  usernameCount: number;
  usernameText: string;
  onConcurrencyChange: (value: string) => void;
  onCancel: () => void;
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
  limits,
  plannedChecks,
  selectedSiteIds,
  sites,
  timeoutMs,
  usernameCount,
  usernameText,
  onConcurrencyChange,
  onCancel,
  onSelectedSiteIdsChange,
  onSubmit,
  onTimeoutMsChange,
  onUsernameTextChange,
}: SearchFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const sitesPerRequest =
    usernameCount === 0 ? 0 : Math.max(1, Math.floor(limits.maxChecksPerRequest / usernameCount));
  const batchCount =
    sitesPerRequest === 0 ? 0 : Math.ceil(selectedSiteIds.length / sitesPerRequest);

  return (
    <form className="min-w-0 space-y-4" onSubmit={onSubmit}>
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
          aria-describedby="username-help"
          disabled={disabled || checking}
          label="Usernames"
          onChange={(event) => onUsernameTextChange(event.currentTarget.value)}
          placeholder={"torvalds\noctocat"}
          rows={5}
          value={usernameText}
        />
        <div id="username-help">
          <Text size="sm" variant="secondary">
            Separate usernames with spaces, commas, or new lines. Up to {limits.maxUsernames}.
          </Text>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-kumo-hairline bg-kumo-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text size="sm">
              {usernameCount} {usernameCount === 1 ? "username" : "usernames"} ·{" "}
              {selectedSiteIds.length} sites
            </Text>
            <Text size="sm" variant="secondary">
              {plannedChecks} planned checks
              {batchCount > 1 ? ` across ${batchCount} requests` : ""}
            </Text>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {checking ? (
              <Button
                className="flex-1 sm:flex-none"
                onClick={onCancel}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            ) : null}
            <Button
              className="flex-1 sm:flex-none"
              disabled={disabled || checking}
              loading={checking}
              type="submit"
              variant="primary"
            >
              Run check
            </Button>
          </div>
        </div>

        <SitePicker
          disabled={disabled || checking}
          onSelectedSiteIdsChange={onSelectedSiteIdsChange}
          selectedSiteIds={selectedSiteIds}
          sites={sites}
        />

        <Collapsible.Root
          className="border-t border-kumo-hairline pt-4"
          onOpenChange={setAdvancedOpen}
          open={advancedOpen}
        >
          <Collapsible.DefaultTrigger className="text-kumo-subtle hover:text-kumo-default">
            Advanced settings
          </Collapsible.DefaultTrigger>
          <Collapsible.DefaultPanel className="mb-0 mt-3">
            <div className="grid gap-3 pt-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
          </Collapsible.DefaultPanel>
        </Collapsible.Root>
      </LayerCard>
    </form>
  );
}
