---
name: mikuru
description: Check whether one or more usernames have accounts on Mikuru's curated sites and return machine-readable evidence. Use when a user asks to search for a username, find matching social profiles, check username availability, or run Mikuru against selected sites.
---

# Mikuru

Run the Mikuru CLI from the repository root, which is `../../..` relative to
the directory containing this `SKILL.md`.

## Workflow

1. Use only usernames supplied by the user. Generate variants only when asked.
2. Build the single-file executable if `dist/mikuru` is missing or the source
   tree has changed:

   ```bash
   bun run build
   ```

3. Run checks with JSON output. By default, `results` contains found accounts
   only:

   ```bash
   ./dist/mikuru --format json <username>
   ```

   Pass multiple usernames as positionals. Limit sites by repeating
   `--site <id-or-name>`.

   Add `--all` only when diagnostics or complete site-by-site results are
   needed.

4. Parse the JSON and report the useful evidence concisely:
   - `found`: the site currently provides positive account evidence.
   - `not_found`: the configured missing-account signal matched.
   - `invalid`: the username is not valid for that site.
   - `blocked`, `unknown`, `error`: inconclusive; do not report these as
     found or not found.

5. Include `profileUrl` for found results. State that matching usernames do
   not prove that the same person controls the accounts.

For site-definition maintenance, run `bun run verify-sites --format json`.
Treat its nonzero exit as a real site-health failure and inspect each status.
