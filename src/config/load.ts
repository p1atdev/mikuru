import * as v from "valibot";
import { manifestSchema } from "./schema.ts";
import type { Condition, LoadedManifest, Manifest, SiteConfig, StringMatcher } from "../types.ts";

const DEFAULT_HEADERS = {
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0 Mikuru/0.1",
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

export function parseManifest(input: unknown): LoadedManifest {
  const parsed = v.safeParse(manifestSchema, input);
  if (!parsed.success) {
    throw new Error(`Invalid site manifest:\n${v.summarize(parsed.issues)}`);
  }

  validateManifestSemantics(parsed.output);

  return {
    version: 1,
    defaults: {
      concurrency: parsed.output.defaults?.concurrency ?? 8,
      timeoutMs: parsed.output.defaults?.timeoutMs ?? 10_000,
      headers: {
        ...DEFAULT_HEADERS,
        ...parsed.output.defaults?.headers,
      },
      blockedStatuses: parsed.output.defaults?.blockedStatuses ?? [403, 429],
    },
    sites: parsed.output.sites.map((site) => ({
      ...site,
      enabled: site.enabled ?? true,
    })),
  };
}

export async function loadManifestFile(path: string): Promise<LoadedManifest> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Manifest not found: ${path}`);
  }

  let input: unknown;
  try {
    input = Bun.YAML.parse(await file.text());
  } catch (error) {
    throw new Error(`Failed to parse YAML manifest ${path}: ${errorMessage(error)}`);
  }

  return parseManifest(input);
}

function validateManifestSemantics(manifest: Manifest): void {
  const ids = new Set<string>();

  for (const site of manifest.sites) {
    if (ids.has(site.id)) {
      throw new Error(`Duplicate site id: ${site.id}`);
    }
    ids.add(site.id);

    validateUrlTemplate(site.profileUrl, site, "profileUrl");
    validateUrlTemplate(site.request.url ?? site.profileUrl, site, "request.url");
    if (
      !containsUsernameTemplate(site.request.url ?? site.profileUrl) &&
      !containsUsernameTemplate(site.request.headers) &&
      !containsUsernameTemplate(site.request.json)
    ) {
      throw new Error(
        `${site.id}.request must contain {username} in its URL, headers, or JSON body`,
      );
    }

    if (site.username?.pattern) {
      compileRegex(site.username.pattern, `${site.id}.username.pattern`);
    }

    for (const [index, rule] of site.rules.entries()) {
      const conditions = [
        ...(rule.when.all ?? []),
        ...(rule.when.any ?? []),
        ...(rule.when.not ?? []),
      ];
      if (conditions.length === 0) {
        throw new Error(`${site.id}.rules[${index}] has no conditions`);
      }
      for (const condition of conditions) {
        validateCondition(condition, `${site.id}.rules[${index}]`);
      }
    }
  }
}

function validateUrlTemplate(template: string, site: SiteConfig, field: string): void {
  try {
    new URL(template.replaceAll("{username}", "example"));
  } catch {
    throw new Error(`${site.id}.${field} is not a valid URL template`);
  }
}

function containsUsernameTemplate(value: unknown): boolean {
  if (typeof value === "string") {
    return value.includes("{username}");
  }
  if (Array.isArray(value)) {
    return value.some(containsUsernameTemplate);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsUsernameTemplate);
  }
  return false;
}

function validateCondition(condition: Condition, path: string): void {
  switch (condition.type) {
    case "status":
      if (condition.in === undefined && condition.between === undefined) {
        throw new Error(`${path}.status must define in or between`);
      }
      if (condition.between !== undefined && condition.between[0] > condition.between[1]) {
        throw new Error(`${path}.status.between must be ordered`);
      }
      return;
    case "url":
    case "body":
      validateStringMatcher(condition, `${path}.${condition.type}`);
      return;
    case "header":
      validateStringMatcher(condition, `${path}.header`);
      return;
    case "json":
      if (
        condition.exists === undefined &&
        condition.equals === undefined &&
        condition.includes === undefined
      ) {
        throw new Error(`${path}.json must define exists, equals, or includes`);
      }
      return;
    case "html":
      if (
        condition.exists === undefined &&
        condition.text === undefined &&
        condition.attribute === undefined
      ) {
        throw new Error(`${path}.html must define exists, text, or attribute`);
      }
      if (condition.text) {
        validateStringMatcher(condition.text, `${path}.html.text`);
      }
      if (condition.attribute?.value) {
        validateStringMatcher(condition.attribute.value, `${path}.html.attribute.value`);
      }
      return;
  }
}

function validateStringMatcher(matcher: StringMatcher, path: string): void {
  if (
    matcher.equals === undefined &&
    matcher.includes === undefined &&
    matcher.matches === undefined
  ) {
    throw new Error(`${path} must define equals, includes, or matches`);
  }
  if (matcher.matches !== undefined) {
    compileRegex(matcher.matches, `${path}.matches`);
  }
}

function compileRegex(pattern: string, path: string): RegExp {
  try {
    return new RegExp(pattern);
  } catch {
    throw new Error(`${path} is not a valid regular expression`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
