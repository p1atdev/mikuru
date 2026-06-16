import { progress, type ProgressResult } from "@clack/prompts";
import { Command } from "@cliffy/command";
import { loadDefaultManifest } from "./config/default.ts";
import { loadManifestFile } from "./config/load.ts";
import { checkUsernames } from "./core/check.ts";
import { createReport, formatJson, formatJsonLines, formatRichText, formatText } from "./output.ts";

const VERSION = "0.1.0";
type OutputFormat = "text" | "json" | "jsonl";

interface CliOptions {
  all?: boolean;
  concurrency?: number;
  config?: string;
  format?: string;
  help?: boolean;
  includeDisabled?: boolean;
  short?: boolean;
  site?: string[];
  timeout?: number;
  version?: boolean;
}

export async function main(args = Bun.argv.slice(2)): Promise<void> {
  let activeProgress: ProgressResult | undefined;

  try {
    const parsed = await buildCommand({ colors: isInteractiveOutput() }).parse(args);
    const options = parsed.options as CliOptions;
    const usernames = parsed.args as string[];

    if (options.help) {
      return;
    }
    if (options.version) {
      console.log(`mikuru ${VERSION}`);
      return;
    }
    if (usernames.length === 0) {
      throw new Error("At least one username is required");
    }

    const format = parseFormat(options.format);
    const concurrency = parsePositiveInteger(options.concurrency, "--concurrency");
    const timeoutMs = parsePositiveInteger(options.timeout, "--timeout");
    const manifest = options.config
      ? await loadManifestFile(options.config)
      : loadDefaultManifest();

    const requestedSites = new Set((options.site ?? []).map((value) => value.toLocaleLowerCase()));
    const sites = manifest.sites.filter((site) => {
      if (!options.includeDisabled && site.enabled === false) {
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

    const richOutput = shouldUseRichOutput(format, { short: options.short });
    const totalChecks = usernames.length * sites.length;
    let foundCount = 0;
    const startedAt = performance.now();

    if (richOutput) {
      activeProgress = progress({
        max: totalChecks,
        output: process.stderr,
        style: "block",
      });
      activeProgress.start(
        `Checking ${sites.length} sites for ${formatUsernameCount(usernames.length)}...`,
      );
    }

    const results = await checkUsernames(usernames, sites, manifest, {
      concurrency,
      timeoutMs,
      onResult: richOutput
        ? (result, completed, total) => {
            if (result.status === "found") {
              foundCount += 1;
            }
            activeProgress?.advance(1, `Checked ${completed}/${total} (${foundCount} found)`);
          }
        : undefined,
    });
    const report = createReport(usernames, results, {
      includeAll: options.all,
    });

    if (activeProgress) {
      activeProgress.stop(
        `Found ${formatCount(report.summary.found, "account")} in ${formatDuration(
          performance.now() - startedAt,
        )}`,
      );
      activeProgress = undefined;
    }

    switch (format) {
      case "json":
        console.log(formatJson(report));
        return;
      case "jsonl":
        console.log(formatJsonLines(report));
        return;
      case "text":
        console.log(
          richOutput
            ? formatRichText(report, {
                colors: true,
                width: process.stdout.columns,
              })
            : formatText(report),
        );
        return;
    }
  } catch (error) {
    activeProgress?.error(`Failed: ${errorMessage(error)}`);
    console.error(`mikuru: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}

function buildCommand(options: { colors: boolean }) {
  return new Command()
    .name("mikuru")
    .description("Check whether usernames exist on selected sites.")
    .help({ colors: options.colors })
    .versionOption(false)
    .option("-v, --version", "Show version")
    .option("-f, --format <format:string>", "Output format", {
      default: "text",
    })
    .option("-s, --site <site:string>", "Limit checks; may be repeated", {
      collect: true,
    })
    .option("-c, --config <path:string>", "Load an external YAML manifest")
    .option("--concurrency <number:integer>", "Maximum simultaneous requests")
    .option("--timeout <milliseconds:integer>", "Per-request timeout")
    .option("-a, --all", "Include non-matches and inconclusive results")
    .option("--short", "Use simple text output without interactive progress or tables")
    .option("--include-disabled", "Include disabled sites")
    .arguments("[username...:string]")
    .throwErrors()
    .noExit();
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === "text" || value === "json" || value === "jsonl") {
    return value;
  }
  throw new Error("--format must be text, json, or jsonl");
}

function parsePositiveInteger(value: number | undefined, option: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${option} must be a positive integer`);
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function shouldUseRichOutput(
  format: OutputFormat,
  options: { short?: boolean } = {},
): boolean {
  return format === "text" && !options.short && isInteractiveOutput();
}

function isInteractiveOutput(): boolean {
  return Boolean(process.stdout.isTTY && process.stderr.isTTY && !isCi());
}

function isCi(): boolean {
  return Boolean(process.env.CI);
}

function formatUsernameCount(count: number): string {
  return formatCount(count, "username");
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`;
  }
  return `${(durationMs / 1_000).toFixed(1)}s`;
}
