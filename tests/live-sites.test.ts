import { expect, test } from "bun:test";
import { loadDefaultManifest } from "../src/config/default.ts";
import { checkUsernameOnSite } from "../src/core/check.ts";

const liveTest = process.env.MIKURU_LIVE === "1" ? test : test.skip;
const manifest = loadDefaultManifest();

for (const site of manifest.sites) {
  if (!site.test || site.enabled === false) {
    continue;
  }

  liveTest(`${site.name} recognizes a known username`, async () => {
    const result = await checkUsernameOnSite(
      site.test!.found,
      site,
      manifest,
      { timeoutMs: 15_000 },
    );
    expect(result.status).toBe("found");
  });
}
