# Mikuru

**EN** | [JP](README.ja.md)

> 重ねた推理で笑顔にジャンプ！

Mikuru is a CLI tool that checks the existence of an account with the same username across multiple services.

It lists only the accounts found, making it straightforward to search for public profiles associated with a username.

## Supported Services

<details>
<summary>List of Supported Services (57 services)</summary>

- GitHub
- GitLab
- Docker Hub
- Bluesky
- Instagram
- X (Twitter)
- YouTube
- Pinterest
- Medium
- Zenn
- note
- SoundCloud
- Threads
- Steam
- npm
- Twitch
- Qiita
- DEV
- Codeberg
- Hugging Face
- AtCoder
- Linktree
- Behance
- Lichess
- Chess.com
- Tumblr
- Codeforces
- LeetCode
- Dribbble
- Vimeo
- Product Hunt
- Gravatar
- Patreon
- RubyGems
- Packagist
- CodePen
- SourceHut
- itch.io
- Hatena
- Kaggle
- Mastodon.social
- Misskey.io
- Bitbucket
- Gitea.com
- NuGet
- Codewars
- Speaker Deck
- Wantedly
- AniList
- Discogs
- Pastebin
- Telegram
- Matrix.org
- VK
- QQ (Qzone)
- mixi2
- Hacker News

</details>

Due to service-side restrictions or specification updates, some checks might temporarily fail.

For QQ, it verifies the existence of a public Qzone. Even if a QQ account exists, it won’t be detected if the Qzone is set to private.

## Skills

You can install the Mikuru skill from GitHub using the `skills` CLI.

```bash
bunx skills add p1atdev/mikuru
```

After installation, you can ask the agent:

```text
Find alice's accounts using Mikuru
```

_Note: Finding accounts with the same username does not guarantee they are managed by the same person._

## Installation

[Bun](https://bun.sh/) and Git are required.

```bash
git clone https://github.com/p1atdev/mikuru.git
cd mikuru
bun install --frozen-lockfile
bun run build
```

The executable will be generated at `dist/mikuru`.

## Usage

Specify user names to search.

```bash
./dist/mikuru alice
```

You can specify multiple user names at once.

```bash
./dist/mikuru alice bob
```

To search only specific services, specify `--site`. You can specify this multiple times.

```bash
./dist/mikuru --site instagram --site twitter alice
```

By default, it only prints services where the account was found.

```text
alice
  FOUND     GitHub  https://github.com/alice

Summary: found=1 not_found=13
```

## JSON Output

To use it from agents or scripts, you can specify JSON or JSON Lines output format.

```bash
./dist/mikuru --format json alice
./dist/mikuru --format jsonl alice bob
```

The `results` key in the JSON output contains only the `found` results by default.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "usernames": ["alice"],
  "results": [
    {
      "username": "alice",
      "site": {
        "id": "github",
        "name": "GitHub"
      },
      "status": "found",
      "profileUrl": "https://github.com/alice"
    }
  ],
  "summary": {
    "found": 1,
    "not_found": 0,
    "invalid": 0,
    "blocked": 0,
    "unknown": 0,
    "error": 0
  }
}
```

For `--format jsonl`, each result is emitted as a single-line JSON object with a `"type": "result"` field, followed by a final `"type": "summary"` line.

## Check All Results

To include elements that were not detected or could not be determined, specify `--all`.

```bash
./dist/mikuru --all alice
```

Status meanings:

| Status      | Meaning                                      |
| ----------- | -------------------------------------------- |
| `found`     | Account was found                            |
| `not_found` | Account was not found                        |
| `invalid`   | Username pattern is invalid on that service  |
| `blocked`   | Could not verify due to WAF or rate limiting |
| `unknown`   | Could not verify from response               |
| `error`     | Connection error or timeout occurred         |

_Note: `not_found` does not guarantee that the username is available for new registration._

## Options

```text
-f, --format <text|json|jsonl>  Output format
-s, --site <id|name>            Limit search targets. Multiple targets can be specified.
-c, --config <path>             Load an external YAML manifest
-a, --all                       Show all results, including non-matches and indeterminate states.
    --short                     Format output in plain flat text instead of rich text.
    --concurrency <number>      Number of concurrent requests
    --timeout <milliseconds>    Timeout for each service check
    --include-disabled          Include sites marked as disabled
-h, --help                      Show help
-v, --version                   Show version
```
