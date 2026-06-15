#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { loadDefaultManifest } from "../src/config/default.ts";
import { checkUsernameOnSite } from "../src/core/check.ts";
import type { CheckResult, SiteConfig } from "../src/types.ts";

const parsed = parseArgs({
  args: Bun.argv.slice(2),
  strict: true,
  options: {
    format: { type: "string", short: "f", default: "text" },
    site: { type: "string", short: "s", multiple: true },
    timeout: { type: "string", default: "15000" },
    "include-disabled": { type: "boolean", default: false },
  },
});

const timeoutMs = Number(parsed.values.timeout);
if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
  throw new Error("--timeout must be a positive integer");
}
if (parsed.values.format !== "text" && parsed.values.format !== "json") {
  throw new Error("--format must be text or json");
}

const manifest = loadDefaultManifest();
const requested = new Set(
  (parsed.values.site ?? []).map((value) => value.toLocaleLowerCase()),
);
const sites = manifest.sites.filter(
  (site) =>
    site.test &&
    (parsed.values["include-disabled"] || site.enabled !== false) &&
    (requested.size === 0 ||
      requested.has(site.id.toLocaleLowerCase()) ||
      requested.has(site.name.toLocaleLowerCase())),
);

if (sites.length === 0) {
  throw new Error("No matching sites with live test fixtures");
}

interface Verification {
  site: Pick<SiteConfig, "id" | "name">;
  found: CheckResult;
  notFound: CheckResult;
  passed: boolean;
}

const verifications: Verification[] = [];
for (const site of sites) {
  const foundUsername = site.test!.found;
  const notFoundUsername = createMissingUsername(site);
  const [found, notFound] = await Promise.all([
    checkUsernameOnSite(foundUsername, site, manifest, { timeoutMs }),
    checkUsernameOnSite(notFoundUsername, site, manifest, { timeoutMs }),
  ]);

  verifications.push({
    site: { id: site.id, name: site.name },
    found,
    notFound,
    passed: found.status === "found" && notFound.status === "not_found",
  });
}

const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  passed: verifications.every((verification) => verification.passed),
  sites: verifications,
};

if (parsed.values.format === "json") {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const verification of verifications) {
    const verdict = verification.passed ? "PASS" : "FAIL";
    console.log(
      `${verdict.padEnd(4)} ${verification.site.name}: found=${verification.found.status}, not_found=${verification.notFound.status}`,
    );
  }
}

if (!report.passed) {
  process.exitCode = 1;
}

function createMissingUsername(site: SiteConfig): string {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return (site.test?.notFoundTemplate ?? `mikuru-${random}`).replaceAll(
    "{random}",
    random,
  );
}
