import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { parseManifest } from "../src/config/load.ts";
import { checkUsernameOnSite } from "../src/core/check.ts";
import { prepareRequest } from "../src/core/request.ts";
import type { LoadedManifest } from "../src/types.ts";

let server: ReturnType<typeof Bun.serve>;
let manifest: LoadedManifest;

beforeAll(() => {
  server = startTestServer();

  manifest = parseManifest({
    version: 1,
    defaults: { blockedStatuses: [429], timeoutMs: 1_000 },
    sites: [
      {
        id: "local",
        name: "Local",
        profileUrl: `${server.url}profiles/{username}`,
        request: {
          url: `${server.url}users/{username}`,
          method: "GET",
        },
        rules: [
          {
            result: "found",
            when: {
              all: [
                { type: "status", in: [200] },
                { type: "json", path: ["user", "name"], equals: "Alice" },
                {
                  type: "header",
                  name: "x-profile",
                  equals: "yes",
                },
              ],
            },
          },
          {
            result: "not_found",
            when: { all: [{ type: "status", in: [404] }] },
          },
        ],
      },
    ],
  });
});

afterAll(() => server?.stop(true));

describe("site checks", () => {
  test("checks found and missing users through fetch", async () => {
    const site = manifest.sites[0]!;
    const [found, notFound] = await Promise.all([
      checkUsernameOnSite("alice", site, manifest),
      checkUsernameOnSite("missing", site, manifest),
    ]);

    expect(found.status).toBe("found");
    expect(found.profileUrl).toBe(`${server.url}profiles/alice`);
    expect(notFound.status).toBe("not_found");
  });

  test("reports timeouts as errors", async () => {
    const timeoutManifest = parseManifest({
      version: 1,
      sites: [
        {
          id: "slow",
          name: "Slow",
          profileUrl: `${server.url}{username}`,
          request: { url: `${server.url}slow?user={username}`, method: "GET" },
          rules: [
            {
              result: "found",
              when: { all: [{ type: "status", in: [200] }] },
            },
          ],
        },
      ],
    });

    const result = await checkUsernameOnSite(
      "alice",
      timeoutManifest.sites[0]!,
      timeoutManifest,
      { timeoutMs: 10 },
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("timed out");
  });

  test("can classify a followed redirect by its final URL", async () => {
    const redirectManifest = parseManifest({
      version: 1,
      sites: [
        {
          id: "redirect",
          name: "Redirect",
          profileUrl: `${server.url}profiles/{username}`,
          request: {
            url: `${server.url}redirect/{username}`,
            method: "GET",
          },
          rules: [
            {
              result: "found",
              when: {
                all: [
                  { type: "url", includes: "/users/alice" },
                  { type: "status", in: [200] },
                ],
              },
            },
          ],
        },
      ],
    });

    const result = await checkUsernameOnSite(
      "alice",
      redirectManifest.sites[0]!,
      redirectManifest,
    );

    expect(result.status).toBe("found");
  });

  test("interpolates usernames in static API request bodies and headers", () => {
    const apiManifest = parseManifest({
      version: 1,
      sites: [
        {
          id: "api",
          name: "API",
          profileUrl: "https://example.com",
          request: {
            url: "https://api.example.com/check",
            method: "POST",
            headers: { "x-username": "{username}" },
            json: { username: "{username}" },
          },
          rules: [
            {
              result: "found",
              when: { all: [{ type: "status", in: [200] }] },
            },
          ],
        },
      ],
    });

    const request = prepareRequest(
      "alice smith",
      apiManifest.sites[0]!,
      apiManifest,
    );

    expect(request.probeUrl).toBe("https://api.example.com/check");
    expect(request.headers.get("x-username")).toBe("alice smith");
    expect(request.body).toBe('{"username":"alice smith"}');
  });
});

function startTestServer(): ReturnType<typeof Bun.serve> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return Bun.serve({
        hostname: "127.0.0.1",
        port: 20_000 + Math.floor(Math.random() * 20_000),
        routes: {
          "/users/alice": () =>
            Response.json(
              { user: { name: "Alice" } },
              { headers: { "x-profile": "yes" } },
            ),
          "/users/missing": () =>
            Response.json({ error: "not found" }, { status: 404 }),
          "/redirect/alice": () =>
            Response.redirect(`${server.url}users/alice`, 302),
          "/slow": async () => {
            await Bun.sleep(100);
            return new Response("slow");
          },
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
