import { expect, test } from "bun:test";
import { loadDefaultManifest } from "../src/config/default.ts";
import { checkUsernameOnSite } from "../src/core/check.ts";

const liveTest = process.env.MIKURU_LIVE === "1" ? test : test.skip;
const manifest = loadDefaultManifest();
const defaultRequestTimeoutMs = 15_000;

for (const site of manifest.sites) {
  if (!site.test || site.enabled === false) {
    continue;
  }

  const requestTimeoutMs = Math.max(defaultRequestTimeoutMs, site.request.timeoutMs ?? 0);
  const foundUsername = site.test.found;
  const notFoundTemplate = site.test.notFoundTemplate;

  liveTest(
    `${site.name} recognizes a known username and rejects a random missing username`,
    async () => {
      const missingUsername = createMissingUsername(notFoundTemplate);
      const [found, notFound] = await Promise.all([
        checkUsernameOnSite(foundUsername, site, manifest, { timeoutMs: requestTimeoutMs }),
        checkUsernameOnSite(missingUsername, site, manifest, { timeoutMs: requestTimeoutMs }),
      ]);

      expect(found.status).toBe("found");
      expect(notFound.status).toBe("not_found");
    },
    requestTimeoutMs + 5_000,
  );
}

function createMissingUsername(template?: string): string {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return (template ?? `mikuru-${random}`).replaceAll("{random}", random);
}
