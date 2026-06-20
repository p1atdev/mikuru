import type { Hono } from "hono";
import type { LoadedManifest, SiteConfig } from "core/src/types";
import type { SiteSummary, SitesResponse } from "../shared";

export function registerSitesApi(app: Hono, manifest: LoadedManifest): void {
  app.get("/api/sites", (c) => {
    return c.json(createSitesResponse(manifest));
  });
}

export function createSitesResponse(manifest: LoadedManifest): SitesResponse {
  return {
    sites: siteSummaries(enabledSites(manifest)),
    defaults: {
      concurrency: manifest.defaults.concurrency,
      timeoutMs: manifest.defaults.timeoutMs,
    },
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
