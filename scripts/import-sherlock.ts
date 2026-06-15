#!/usr/bin/env bun

import { parseArgs } from "node:util";
import type {
  Condition,
  HttpMethod,
  Manifest,
  Rule,
  SiteConfig,
} from "../src/types.ts";

interface SherlockSite {
  url: string;
  urlMain: string;
  urlProbe?: string;
  username_claimed: string;
  regexCheck?: string;
  isNSFW?: boolean;
  headers?: Record<string, string>;
  request_payload?: unknown;
  request_method?: HttpMethod;
  errorType: string | string[];
  errorMsg?: string | string[];
  errorCode?: number | number[];
}

const parsed = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  strict: true,
  options: {
    help: { type: "boolean", short: "h" },
  },
});

if (parsed.values.help || parsed.positionals.length !== 1) {
  console.log("Usage: bun run import:sherlock <data.json path or URL>");
  process.exit(parsed.values.help ? 0 : 1);
}

const source = parsed.positionals[0]!;
const raw = source.startsWith("http://") || source.startsWith("https://")
  ? await fetch(source).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to download ${source}: HTTP ${response.status}`);
      }
      return response.json();
    })
  : await Bun.file(source).json();

if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
  throw new Error("Sherlock data must be a JSON object");
}

const sites: SiteConfig[] = [];
for (const [name, value] of Object.entries(raw)) {
  if (name.startsWith("$") || !isSherlockSite(value)) {
    continue;
  }
  sites.push(convertSite(name, value));
}

const manifest: Manifest = {
  version: 1,
  defaults: {
    concurrency: 8,
    timeoutMs: 10_000,
    blockedStatuses: [403, 429],
  },
  sites,
};

console.log(Bun.YAML.stringify(manifest, null, 2));

function convertSite(name: string, source: SherlockSite): SiteConfig {
  const errorTypes = Array.isArray(source.errorType)
    ? source.errorType
    : [source.errorType];
  const notFoundConditions: Condition[] = [];
  const foundAll: Condition[] = [];
  const foundNot: Condition[] = [];

  if (errorTypes.includes("message") && source.errorMsg !== undefined) {
    const messageCondition: Condition = {
      type: "body",
      includes: source.errorMsg,
    };
    notFoundConditions.push(messageCondition);
    foundNot.push(messageCondition);
  }

  if (
    errorTypes.includes("status_code") ||
    errorTypes.includes("response_url")
  ) {
    const errorCodes = source.errorCode === undefined
      ? undefined
      : Array.isArray(source.errorCode)
        ? source.errorCode
        : [source.errorCode];
    notFoundConditions.push(
      errorCodes
        ? { type: "status", in: errorCodes }
        : { type: "status", between: [300, 599] },
    );
    foundAll.push({ type: "status", between: [200, 299] });
  } else {
    foundAll.push({ type: "status", between: [200, 299] });
  }

  const rules: Rule[] = [
    {
      result: "not_found",
      reason: "Imported from Sherlock missing-account detection",
      when: { any: notFoundConditions },
    },
    {
      result: "found",
      reason: "Imported from Sherlock found-account detection",
      when: {
        all: foundAll,
        not: foundNot,
      },
    },
  ];

  const requestMethod =
    source.request_method ??
    (errorTypes.length === 1 && errorTypes[0] === "status_code"
      ? "HEAD"
      : "GET");

  return {
    id: slugify(name),
    name,
    profileUrl: replacePlaceholder(source.url),
    tags: source.isNSFW ? ["adult"] : undefined,
    username: source.regexCheck ? { pattern: source.regexCheck } : undefined,
    request: {
      url: replacePlaceholder(source.urlProbe ?? source.url),
      method: requestMethod,
      redirects: errorTypes.includes("response_url") ? "manual" : "follow",
      headers: source.headers,
      json: source.request_payload
        ? replaceValuePlaceholders(source.request_payload)
        : undefined,
    },
    rules,
    test: {
      found: source.username_claimed,
      notFoundTemplate: "mikuru-check-{random}",
    },
  };
}

function replacePlaceholder(value: string): string {
  return value.replaceAll("{}", "{username}");
}

function replaceValuePlaceholders(value: unknown): unknown {
  if (typeof value === "string") {
    return replacePlaceholder(value);
  }
  if (Array.isArray(value)) {
    return value.map(replaceValuePlaceholders);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceValuePlaceholders(item),
      ]),
    );
  }
  return value;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `site-${crypto.randomUUID().slice(0, 8)}`;
}

function isSherlockSite(value: unknown): value is SherlockSite {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const site = value as Record<string, unknown>;
  return (
    typeof site.url === "string" &&
    typeof site.urlMain === "string" &&
    typeof site.username_claimed === "string" &&
    (typeof site.errorType === "string" || Array.isArray(site.errorType))
  );
}
