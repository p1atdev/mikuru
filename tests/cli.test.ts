import { describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { main, shouldUseRichOutput } from "../src/cli.ts";

describe("cli", () => {
  test("prints the existing version string", async () => {
    const output = await captureMain(["--version"]);

    expect(output.stdout).toBe("mikuru 0.1.0");
    expect(output.stderr).toBe("");
    expect(output.exitCode).toBeUndefined();
  });

  test("keeps json output machine-readable", async () => {
    const server = startTestServer();
    const manifestPath = await writeManifest(server.url.toString());

    try {
      const output = await captureMain(["--format", "json", "--config", manifestPath, "alice"]);
      const report = JSON.parse(output.stdout);

      expect(output.stderr).toBe("");
      expect(output.stdout).not.toContain("\x1b[");
      expect(output.exitCode).toBeUndefined();
      expect(report.results).toHaveLength(1);
      expect(report.results[0]).toMatchObject({
        username: "alice",
        status: "found",
        site: { id: "local", name: "Local" },
      });
    } finally {
      await unlink(manifestPath);
      server.stop(true);
    }
  });

  test("uses simple text output with --short even on an interactive terminal", async () => {
    const server = startTestServer();
    const manifestPath = await writeManifest(server.url.toString());
    const restoreStdout = replaceIsTty(process.stdout, true);
    const restoreStderr = replaceIsTty(process.stderr, true);
    const originalCi = process.env.CI;

    try {
      delete process.env.CI;
      const output = await captureMain(["--short", "--config", manifestPath, "alice"]);

      expect(output.stderr).toBe("");
      expect(output.stdout).toContain("FOUND     Local");
      expect(output.stdout).toContain(`${server.url}profiles/alice`);
      expect(output.stdout).not.toContain("Status");
      expect(output.stdout).not.toContain("\x1b[");
      expect(output.exitCode).toBeUndefined();
    } finally {
      restoreStdout();
      restoreStderr();
      if (originalCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = originalCi;
      }
      await unlink(manifestPath);
      server.stop(true);
    }
  });

  test("enables rich output only for interactive text output outside CI", () => {
    const restoreStdout = replaceIsTty(process.stdout, true);
    const restoreStderr = replaceIsTty(process.stderr, true);
    const originalCi = process.env.CI;

    try {
      delete process.env.CI;
      expect(shouldUseRichOutput("text")).toBeTrue();
      expect(shouldUseRichOutput("text", { short: true })).toBeFalse();
      expect(shouldUseRichOutput("json")).toBeFalse();

      process.env.CI = "1";
      expect(shouldUseRichOutput("text")).toBeFalse();
    } finally {
      restoreStdout();
      restoreStderr();
      if (originalCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = originalCi;
      }
    }
  });
});

async function captureMain(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: string | number | undefined;
}> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;

  console.log = (...values: unknown[]) => {
    stdout.push(values.map(String).join(" "));
  };
  console.error = (...values: unknown[]) => {
    stderr.push(values.map(String).join(" "));
  };

  try {
    await main(args);
    return {
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
      exitCode: process.exitCode,
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
}

async function writeManifest(baseUrl: string): Promise<string> {
  const path = `/private/tmp/mikuru-cli-${crypto.randomUUID()}.yaml`;
  await Bun.write(
    path,
    `version: 1
defaults:
  concurrency: 1
  timeoutMs: 1000
sites:
  - id: local
    name: Local
    profileUrl: "${baseUrl}profiles/{username}"
    request:
      url: "${baseUrl}users/{username}"
      method: GET
    rules:
      - result: found
        when:
          all:
            - type: status
              in: [200]
      - result: not_found
        when:
          all:
            - type: status
              in: [404]
`,
  );
  return path;
}

function startTestServer(): ReturnType<typeof Bun.serve> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        routes: {
          "/users/alice": () => new Response("ok"),
          "/users/missing": () => new Response("not found", { status: 404 }),
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function replaceIsTty(
  stream: typeof process.stdout | typeof process.stderr,
  value: boolean,
): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(stream, "isTTY");
  Object.defineProperty(stream, "isTTY", {
    configurable: true,
    value,
  });

  return () => {
    if (descriptor) {
      Object.defineProperty(stream, "isTTY", descriptor);
    } else {
      delete (stream as { isTTY?: boolean }).isTTY;
    }
  };
}
