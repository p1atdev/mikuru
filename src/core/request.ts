import { responseNeedsBody } from "./evaluate.ts";
import {
  interpolateTemplate,
  interpolateTextTemplate,
  interpolateValue,
} from "./template.ts";
import type {
  LoadedManifest,
  ProbeResponse,
  RedirectMode,
  SiteConfig,
} from "../types.ts";

export interface PreparedRequest {
  profileUrl: string;
  probeUrl: string;
  method: "GET" | "HEAD" | "POST" | "PUT";
  redirects: RedirectMode;
  timeoutMs: number;
  headers: Headers;
  body?: string;
}

export function prepareRequest(
  username: string,
  site: SiteConfig,
  manifest: LoadedManifest,
  timeoutOverride?: number,
): PreparedRequest {
  const needsBody = responseNeedsBody(site.rules);
  const method = site.request.method ?? (needsBody ? "GET" : "HEAD");
  if (needsBody && method === "HEAD") {
    throw new Error(`${site.id} uses body rules but request.method is HEAD`);
  }

  const headers = new Headers(
    Object.fromEntries(
      Object.entries({
        ...manifest.defaults.headers,
        ...site.request.headers,
      }).map(([name, value]) => [
        name,
        interpolateTextTemplate(value, username),
      ]),
    ),
  );

  let body: string | undefined;
  if (site.request.json !== undefined) {
    body = JSON.stringify(interpolateValue(site.request.json, username));
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return {
    profileUrl: interpolateTemplate(site.profileUrl, username),
    probeUrl: interpolateTemplate(
      site.request.url ?? site.profileUrl,
      username,
    ),
    method,
    redirects: site.request.redirects ?? "follow",
    timeoutMs:
      timeoutOverride ?? site.request.timeoutMs ?? manifest.defaults.timeoutMs,
    headers,
    body,
  };
}

export async function executeRequest(
  request: PreparedRequest,
): Promise<ProbeResponse> {
  const startedAt = performance.now();
  const response = await fetch(request.probeUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: request.redirects,
    signal: AbortSignal.timeout(request.timeoutMs),
  });

  const body =
    request.method === "HEAD" ? undefined : await response.text();

  return {
    status: response.status,
    url: response.url,
    headers: response.headers,
    body,
    durationMs: performance.now() - startedAt,
  };
}
