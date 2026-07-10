import { mapConcurrent } from "./concurrency.ts";
import { evaluateResponse } from "./evaluate.ts";
import { executeRequest, prepareRequest } from "./request.ts";
import type { CheckOptions, CheckResult, LoadedManifest, SiteConfig } from "../types.ts";

export async function checkUsernameOnSite(
  username: string,
  site: SiteConfig,
  manifest: LoadedManifest,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const checkedAt = new Date().toISOString();
  const startedAt = performance.now();
  const profileUrl = site.profileUrl.replaceAll("{username}", encodeURIComponent(username));

  if (site.username?.pattern && !new RegExp(site.username.pattern).test(username)) {
    return {
      username,
      site: { id: site.id, name: site.name },
      status: "invalid",
      profileUrl,
      durationMs: performance.now() - startedAt,
      checkedAt,
    };
  }

  let prepared;
  try {
    prepared = prepareRequest(username, site, manifest, options.timeoutMs);
    const response = await executeRequest(prepared);
    const evaluation = await evaluateResponse(
      response,
      site.rules,
      site.blockedStatuses ?? manifest.defaults.blockedStatuses,
    );

    return {
      username,
      site: { id: site.id, name: site.name },
      status: evaluation.status,
      profileUrl: prepared.profileUrl,
      probeUrl: prepared.probeUrl,
      httpStatus: response.status,
      durationMs: response.durationMs,
      evidence: evaluation.evidence,
      checkedAt,
    };
  } catch (error) {
    return {
      username,
      site: { id: site.id, name: site.name },
      status: "error",
      profileUrl,
      probeUrl: prepared?.probeUrl,
      durationMs: performance.now() - startedAt,
      error: errorMessage(error),
      checkedAt,
    };
  }
}

export async function checkUsernames(
  usernames: string[],
  sites: SiteConfig[],
  manifest: LoadedManifest,
  options: CheckOptions & {
    concurrency?: number;
    onResult?: (result: CheckResult, completed: number, total: number) => Promise<void> | void;
  } = {},
): Promise<CheckResult[]> {
  const jobs = usernames.flatMap((username) => sites.map((site) => ({ username, site })));
  let completed = 0;

  return mapConcurrent(
    jobs,
    options.concurrency ?? manifest.defaults.concurrency,
    async ({ username, site }) => {
      const result = await checkUsernameOnSite(username, site, manifest, options);
      completed += 1;
      await options.onResult?.(result, completed, jobs.length);
      return result;
    },
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "Request timed out";
  }
  return error instanceof Error ? error.message : String(error);
}
