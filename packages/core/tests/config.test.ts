import { describe, expect, test } from "bun:test";
import { loadDefaultManifest } from "../src/config/default";
import { parseManifest } from "../src/config/load";

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
});
