import { describe, expect, test } from "bun:test";
import { loadDefaultManifest } from "../src/config/default";
import { parseManifest } from "../src/config/load";
import { evaluateResponse } from "../src/core/evaluate";
import { prepareRequest } from "../src/core/request";
import type { ProbeResponse } from "../src/types";

describe("manifest", () => {
  test("loads the bundled site manifest", () => {
    const manifest = loadDefaultManifest();

    expect(manifest.version).toBe(1);
    expect(manifest.defaults.concurrency).toBe(16);
    expect(manifest.sites.length).toBeGreaterThanOrEqual(15);
    expect(manifest.sites.map((site) => site.id)).toEqual(
      expect.arrayContaining([
        "github",
        "instagram",
        "twitter",
        "youtube",
        "pinterest",
        "medium",
        "zenn",
        "note",
        "soundcloud",
        "threads",
        "steam",
        "npm",
        "twitch",
        "qiita",
        "dev",
        "codeberg",
        "hugging-face",
        "atcoder",
        "linktree",
        "behance",
        "lichess",
        "chess-com",
        "tumblr",
        "codeforces",
        "leetcode",
        "dribbble",
        "vimeo",
        "product-hunt",
        "gravatar",
        "patreon",
        "rubygems",
        "packagist",
        "codepen",
        "sourcehut",
        "itch-io",
        "hatena",
        "kaggle",
        "mastodon-social",
        "misskey-io",
        "bitbucket",
        "gitea",
        "nuget",
        "codewars",
        "speaker-deck",
        "wantedly",
        "anilist",
        "discogs",
        "pastebin",
        "telegram",
        "matrix-org",
        "vk",
        "qq-qzone",
      ]),
    );
  });

  test("rejects duplicate site ids", () => {
    const site = {
      id: "example",
      name: "Example",
      profileUrl: "https://example.com/{username}",
      request: {},
      rules: [
        {
          result: "found",
          when: { all: [{ type: "status", in: [200] }] },
        },
      ],
    };

    expect(() => parseManifest({ version: 1, sites: [site, site] })).toThrow("Duplicate site id");
  });

  test("rejects rules without conditions", () => {
    expect(() =>
      parseManifest({
        version: 1,
        sites: [
          {
            id: "example",
            name: "Example",
            profileUrl: "https://example.com/{username}",
            request: {},
            rules: [{ result: "found", when: {} }],
          },
        ],
      }),
    ).toThrow("has no conditions");
  });

  test("steam requires profile-specific markup before reporting found", () => {
    const manifest = loadDefaultManifest();
    const steam = manifest.sites.find((site) => site.id === "steam");

    expect(steam).toBeDefined();
    if (!steam) {
      throw new Error("steam site missing from manifest");
    }

    expect(
      evaluateResponse(
        response({
          body: "<title>Steam Community :: Error</title>",
        }),
        steam.rules,
        [],
      ).status,
    ).toBe("not_found");
    expect(
      evaluateResponse(
        response({
          body: "<title>Steam Community</title><main>not a profile</main>",
        }),
        steam.rules,
        [],
      ).status,
    ).toBe("unknown");
    expect(
      evaluateResponse(
        response({
          body: '<div class="profile_header_bg"></div>',
        }),
        steam.rules,
        [],
      ).status,
    ).toBe("found");
  });

  test("npm uses a browser-like GET request without reading the body", () => {
    const manifest = loadDefaultManifest();
    const npm = manifest.sites.find((site) => site.id === "npm");

    expect(npm).toBeDefined();
    if (!npm) {
      throw new Error("npm site missing from manifest");
    }

    const request = prepareRequest("sindresorhus", npm, manifest);

    expect(request.method).toBe("GET");
    expect(request.readBody).toBeFalse();
  });
});

function response(overrides: Partial<ProbeResponse> = {}): ProbeResponse {
  return {
    status: 200,
    url: "https://example.com",
    headers: new Headers(),
    durationMs: 1,
    ...overrides,
  };
}
