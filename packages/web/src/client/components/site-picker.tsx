/** @jsxImportSource react */

import { Button, Checkbox, Input, Text } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import type { SiteSummary } from "../../shared";

interface SitePickerProps {
  disabled?: boolean;
  sites: SiteSummary[];
  selectedSiteIds: string[];
  onSelectedSiteIdsChange: (siteIds: string[]) => void;
}

export function SitePicker({
  disabled = false,
  sites,
  selectedSiteIds,
  onSelectedSiteIdsChange,
}: SitePickerProps) {
  const [filter, setFilter] = useState("");
  const selected = useMemo(() => new Set(selectedSiteIds), [selectedSiteIds]);
  const visibleSites = useMemo(() => filterSites(sites, filter), [filter, sites]);
  const allSelected = sites.length > 0 && selectedSiteIds.length === sites.length;
  const partiallySelected = selectedSiteIds.length > 0 && selectedSiteIds.length < sites.length;

  function setAll(checked: boolean) {
    onSelectedSiteIdsChange(checked ? sites.map((site) => site.id) : []);
  }

  function toggleSite(siteId: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(siteId);
    } else {
      next.delete(siteId);
    }
    onSelectedSiteIdsChange(sites.filter((site) => next.has(site.id)).map((site) => site.id));
  }

  return (
    <section aria-labelledby="site-picker-heading" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Text as="h2" id="site-picker-heading" variant="heading3">
            Sites
          </Text>
          <Text size="sm" variant="secondary">
            {selectedSiteIds.length} of {sites.length} enabled sites selected.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button disabled={disabled || sites.length === 0} onClick={() => setAll(true)} size="sm">
            Select all
          </Button>
          <Button
            disabled={disabled || selectedSiteIds.length === 0}
            onClick={() => setAll(false)}
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          aria-label="Filter sites"
          className="min-w-0 w-full"
          disabled={disabled}
          onChange={(event) => setFilter(event.currentTarget.value)}
          placeholder="Filter sites"
          value={filter}
        />

        <Checkbox
          checked={allSelected}
          disabled={disabled || sites.length === 0}
          indeterminate={partiallySelected}
          label="All enabled sites"
          onCheckedChange={(checked) => setAll(Boolean(checked))}
        />
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-kumo-hairline bg-kumo-base p-3">
        {visibleSites.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleSites.map((site) => (
              <Checkbox
                checked={selected.has(site.id)}
                className="min-w-0"
                disabled={disabled}
                key={site.id}
                label={
                  <span className="min-w-0">
                    <span className="block truncate">{site.name}</span>
                    <span className="block truncate text-xs text-kumo-subtle">{site.id}</span>
                  </span>
                }
                onCheckedChange={(checked) => toggleSite(site.id, Boolean(checked))}
              />
            ))}
          </div>
        ) : (
          <Text size="sm" variant="secondary">
            No sites match the current filter.
          </Text>
        )}
      </div>
    </section>
  );
}

function filterSites(sites: SiteSummary[], filter: string): SiteSummary[] {
  const normalized = filter.trim().toLocaleLowerCase();
  if (!normalized) {
    return sites;
  }

  return sites.filter((site) => {
    const haystack = [site.id, site.name, ...site.tags].join(" ").toLocaleLowerCase();
    return haystack.includes(normalized);
  });
}
