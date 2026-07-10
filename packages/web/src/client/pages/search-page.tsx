/** @jsxImportSource react */

import { Banner, Text } from "@cloudflare/kumo";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  WEB_CHECK_LIMITS,
  type CheckResponse,
  type SiteSummary,
  type SitesResponse,
} from "../../shared";
import { CheckProgressCard } from "../components/check-progress";
import { ResultsTable, type ResultView } from "../components/results-table";
import { SearchForm } from "../components/search-form";
import { SummaryStrip } from "../components/summary-strip";
import { fetchSites, runCheck, type CheckProgress } from "../lib/api";
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
  const [formError, setFormError] = useState<string>();
  const [checkError, setCheckError] = useState<string>();
  const [checkCancelled, setCheckCancelled] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState<CheckProgress>();
  const [report, setReport] = useState<CheckResponse>();
  const [resultView, setResultView] = useState<ResultView>("matches");
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

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
    setCheckCancelled(undefined);

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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let latestProgress: CheckProgress | undefined;

    setChecking(true);
    setCheckProgress(undefined);
    setReport(undefined);
    try {
      setReport(
        await runCheck(
          {
            usernames,
            siteIds: selectedSiteIds,
            concurrency: parsedConcurrency.value,
            timeoutMs: parsedTimeout.value,
          },
          {
            signal: abortController.signal,
            onProgress: (progress) => {
              latestProgress = progress;
              setCheckProgress(progress);
              if (progress.report) {
                setReport(progress.report);
              }
            },
          },
        ),
      );
    } catch (error) {
      const completed = latestProgress?.completedChecks ?? 0;
      const total = latestProgress?.totalChecks ?? plannedChecks;
      if (isAbortError(error)) {
        setCheckCancelled(
          completed > 0
            ? `Stopped after ${completed} of ${total} checks. Completed results remain below.`
            : "The check was stopped before any results completed.",
        );
      } else {
        const message = error instanceof Error ? error.message : String(error);
        setCheckError(
          completed > 0
            ? `Stopped after ${completed} of ${total} checks. Completed results remain below. ${message}`
            : message,
        );
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = undefined;
      }
      setChecking(false);
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
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

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <SearchForm
            checking={checking}
            concurrency={concurrency}
            defaults={defaults}
            disabled={disabled}
            formError={formError}
            limits={limits}
            onConcurrencyChange={setConcurrency}
            onCancel={handleCancel}
            onSelectedSiteIdsChange={setSelectedSiteIds}
            onSubmit={handleSubmit}
            onTimeoutMsChange={setTimeoutMs}
            onUsernameTextChange={setUsernameText}
            plannedChecks={plannedChecks}
            selectedSiteIds={selectedSiteIds}
            sites={sites}
            timeoutMs={timeoutMs}
            usernameCount={usernames.length}
            usernameText={usernameText}
          />

          <section aria-label="Search output" className="min-w-0 space-y-4">
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
            {checkCancelled ? (
              <Banner description={checkCancelled} title="Check cancelled" />
            ) : null}
            {checking && checkProgress ? <CheckProgressCard progress={checkProgress} /> : null}
            {report ? <SummaryStrip report={report} /> : null}
            <ResultsTable onViewChange={setResultView} report={report} view={resultView} />
          </section>
        </div>
      </div>
    </main>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
