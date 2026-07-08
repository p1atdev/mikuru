import { expect, test } from "bun:test";
import { Miniflare } from "miniflare";

test("HTML rules evaluate in the Workers runtime", async () => {
  const build = await Bun.build({
    entrypoints: [new URL("./fixtures/html-rewriter-worker.ts", import.meta.url).pathname],
    format: "esm",
    target: "browser",
  });
  if (!build.success) {
    throw new Error(build.logs.map(String).join("\n"));
  }

  const output = build.outputs[0];
  if (!output) {
    throw new Error("Worker bundle was not generated");
  }

  const worker = new Miniflare({
    compatibilityDate: "2026-06-20",
    modules: true,
    script: await output.text(),
  });

  try {
    const response = await worker.dispatchFetch("https://mikuru.test/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "found",
      evidence: {
        rule: 0,
        result: "found",
        reason: "profile metadata matched",
      },
    });
  } finally {
    await worker.dispose();
  }
});
