import type { Hono } from "hono";
import type { LoadedManifest, SiteConfig } from "core/src/types";
import { WEB_CHECK_LIMITS, type SiteSummary, type SitesResponse } from "../shared";

export function registerSitesApi(app: Hono, manifest: LoadedManifest): void {
  app.get("/api/sites", (c) => {
    return c.json(createSitesResponse(manifest));
  });
}

export function createSitesResponse(manifest: LoadedManifest): SitesResponse {
  return {
    sites: siteSummaries(enabledSites(manifest)),
    defaults: {
      concurrency: webDefaultConcurrency(manifest),
      timeoutMs: webDefaultTimeoutMs(manifest),
    },
    limits: WEB_CHECK_LIMITS,
  };
}

export function enabledSites(manifest: LoadedManifest): SiteConfig[] {
  return manifest.sites.filter((site) => site.enabled !== false);
}

export function siteSummaries(sites: SiteConfig[]): SiteSummary[] {
  return sites.map((site) => ({
    id: site.id,
    name: site.name,
    tags: site.tags ?? [],
  }));
}

export function webDefaultConcurrency(manifest: LoadedManifest): number {
  return Math.min(manifest.defaults.concurrency, WEB_CHECK_LIMITS.maxConcurrency);
}

export function webDefaultTimeoutMs(manifest: LoadedManifest): number {
  return Math.min(manifest.defaults.timeoutMs, WEB_CHECK_LIMITS.maxTimeoutMs);
}
