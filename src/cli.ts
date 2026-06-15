import { parseArgs } from "node:util";
import { loadDefaultManifest } from "./config/default.ts";
import { loadManifestFile } from "./config/load.ts";
import { checkUsernames } from "./core/check.ts";
import { createReport, formatJson, formatJsonLines, formatText } from "./output.ts";

const VERSION = "0.1.0";

export async function main(args = Bun.argv.slice(2)): Promise<void> {
  try {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        format: { type: "string", short: "f", default: "text" },
        site: { type: "string", short: "s", multiple: true },
        config: { type: "string", short: "c" },
        concurrency: { type: "string" },
        timeout: { type: "string" },
        all: { type: "boolean", short: "a", default: false },
        "include-disabled": { type: "boolean", default: false },
      },
    });

    if (parsed.values.help) {
      console.log(helpText());
      return;
    }
    if (parsed.values.version) {
      console.log(`mikuru ${VERSION}`);
      return;
    }
    if (parsed.positionals.length === 0) {
      throw new Error("At least one username is required");
    }

    const format = parseFormat(parsed.values.format);
    const concurrency = parsePositiveInteger(parsed.values.concurrency, "--concurrency");
    const timeoutMs = parsePositiveInteger(parsed.values.timeout, "--timeout");
    const manifest = parsed.values.config
      ? await loadManifestFile(parsed.values.config)
      : loadDefaultManifest();

    const requestedSites = new Set(
      (parsed.values.site ?? []).map((value) => value.toLocaleLowerCase()),
    );
    const sites = manifest.sites.filter((site) => {
      if (!parsed.values["include-disabled"] && site.enabled === false) {
        return false;
      }
      return (
        requestedSites.size === 0 ||
        requestedSites.has(site.id.toLocaleLowerCase()) ||
        requestedSites.has(site.name.toLocaleLowerCase())
      );
    });

    if (sites.length === 0) {
      throw new Error("No matching enabled sites");
    }

    if (requestedSites.size > 0) {
      const matched = new Set(
        sites.flatMap((site) => [site.id.toLocaleLowerCase(), site.name.toLocaleLowerCase()]),
      );
      const missing = [...requestedSites].filter((site) => !matched.has(site));
      if (missing.length > 0) {
        throw new Error(`Unknown sites: ${missing.join(", ")}`);
      }
    }

    const results = await checkUsernames(parsed.positionals, sites, manifest, {
      concurrency,
      timeoutMs,
    });
    const report = createReport(parsed.positionals, results, {
      includeAll: parsed.values.all,
    });

    switch (format) {
      case "json":
        console.log(formatJson(report));
        return;
      case "jsonl":
        console.log(formatJsonLines(report));
        return;
      case "text":
        console.log(formatText(report));
        return;
    }
  } catch (error) {
    console.error(`mikuru: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}

function parseFormat(value: string | undefined): "text" | "json" | "jsonl" {
  if (value === "text" || value === "json" || value === "jsonl") {
    return value;
  }
  throw new Error("--format must be text, json, or jsonl");
}

function parsePositiveInteger(value: string | undefined, option: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${option} must be a positive integer`);
  }
  return parsed;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function helpText(): string {
  return `Mikuru - check whether usernames exist on selected sites

Usage:
  mikuru [options] <username...>

Options:
  -f, --format <text|json|jsonl>  Output format (default: text)
  -s, --site <id|name>            Limit checks; may be repeated
  -c, --config <path>             Load an external YAML manifest
      --concurrency <number>      Maximum simultaneous requests
      --timeout <milliseconds>    Per-request timeout
  -a, --all                       Include non-matches and inconclusive results
      --include-disabled          Include disabled sites
  -h, --help                      Show help
  -v, --version                   Show version`;
}
