/** @jsxImportSource react */

import { Banner, Text } from "@cloudflare/kumo";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  WEB_CHECK_LIMITS,
  type CheckResponse,
  type SiteSummary,
  type SitesResponse,
} from "../../shared";
import { ResultsTable } from "../components/results-table";
import { SearchForm } from "../components/search-form";
import { SummaryStrip } from "../components/summary-strip";
import { fetchSites, runCheck } from "../lib/api";
import { parseOptionalPositiveInteger, parseUsernames } from "../lib/usernames";

type LoadState = "loading" | "ready" | "error";

export function SearchPage() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [defaults, setDefaults] = useState<SitesResponse["defaults"]>();
  const [limits, setLimits] = useState<SitesResponse["limits"]>(WEB_CHECK_LIMITS);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [siteLoadState, setSiteLoadState] = useState<LoadState>("loading");
  const [siteLoadError, setSiteLoadError] = useState<string>();
  const [usernameText, setUsernameText] = useState("");
  const [concurrency, setConcurrency] = useState("");
  const [timeoutMs, setTimeoutMs] = useState("");
  const [includeAll, setIncludeAll] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [checkError, setCheckError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<CheckResponse>();

  useEffect(() => {
    let active = true;

    fetchSites()
      .then((response) => {
        if (!active) {
          return;
        }
        setSites(response.sites);
        setDefaults(response.defaults);
        setLimits(response.limits);
        setSelectedSiteIds(response.sites.map((site) => site.id));
        setSiteLoadState("ready");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setSiteLoadError(error instanceof Error ? error.message : String(error));
        setSiteLoadState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const usernames = useMemo(() => parseUsernames(usernameText), [usernameText]);
  const plannedChecks = usernames.length * selectedSiteIds.length;
  const disabled = siteLoadState !== "ready";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setCheckError(undefined);

    if (usernames.length === 0) {
      setFormError("At least one username is required.");
      return;
    }
    if (usernames.length > limits.maxUsernames) {
      setFormError(`At most ${limits.maxUsernames} usernames can be checked at once.`);
      return;
    }
    if (selectedSiteIds.length === 0) {
      setFormError("At least one site is required.");
      return;
    }

    const parsedConcurrency = parseOptionalPositiveInteger(concurrency, "Concurrency");
    if (!parsedConcurrency.ok) {
      setFormError(parsedConcurrency.error);
      return;
    }
    if (parsedConcurrency.value !== undefined && parsedConcurrency.value > limits.maxConcurrency) {
      setFormError(`Concurrency must be at most ${limits.maxConcurrency}.`);
      return;
    }

    const parsedTimeout = parseOptionalPositiveInteger(timeoutMs, "Timeout ms");
    if (!parsedTimeout.ok) {
      setFormError(parsedTimeout.error);
      return;
    }
    if (parsedTimeout.value !== undefined && parsedTimeout.value > limits.maxTimeoutMs) {
      setFormError(`Timeout ms must be at most ${limits.maxTimeoutMs}.`);
      return;
    }

    setChecking(true);
    try {
      setReport(
        await runCheck({
          usernames,
          siteIds: selectedSiteIds,
          concurrency: parsedConcurrency.value,
          timeoutMs: parsedTimeout.value,
        }),
      );
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : String(error));
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="min-h-screen bg-kumo-canvas text-kumo-default">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-2 border-b border-kumo-hairline pb-5">
          <Text as="h1" variant="heading1">
            Mikuru
          </Text>
          <div className="max-w-3xl">
            <Text variant="secondary">
              Check whether usernames have public accounts across the supported site manifest.
            </Text>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <SearchForm
            checking={checking}
            concurrency={concurrency}
            defaults={defaults}
            disabled={disabled}
            formError={formError}
            includeAll={includeAll}
            limits={limits}
            onConcurrencyChange={setConcurrency}
            onIncludeAllChange={setIncludeAll}
            onSelectedSiteIdsChange={setSelectedSiteIds}
            onSubmit={handleSubmit}
            onTimeoutMsChange={setTimeoutMs}
            onUsernameTextChange={setUsernameText}
            plannedChecks={plannedChecks}
            selectedSiteIds={selectedSiteIds}
            sites={sites}
            timeoutMs={timeoutMs}
            usernameText={usernameText}
          />

          <section aria-label="Search output" className="space-y-4">
            {siteLoadState === "loading" ? (
              <Banner description="Fetching enabled sites." title="Loading site manifest" />
            ) : null}
            {siteLoadState === "error" ? (
              <Banner
                description={siteLoadError}
                title="Could not load site manifest"
                variant="error"
              />
            ) : null}
            {checkError ? (
              <Banner description={checkError} title="Check failed" variant="error" />
            ) : null}
            {report ? <SummaryStrip report={report} /> : null}
            <ResultsTable includeAll={includeAll} report={report} />
          </section>
        </div>
      </div>
    </main>
  );
}
