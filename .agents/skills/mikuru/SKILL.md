---
name: mikuru
description: Check whether one or more usernames have public accounts across Mikuru's curated services. Use when a user asks to search for a username, find matching social profiles, investigate username reuse, or check selected services. The bundled launcher fetches and builds Mikuru from GitHub, so no local Mikuru checkout is required.
---

# Mikuru

Use the bundled `scripts/mikuru` launcher. Do not assume the current working
directory contains the Mikuru repository.

## Run

1. Resolve `SKILL_DIR` as the directory containing this `SKILL.md`.
2. Run the launcher with Bash and JSON output:

   ```bash
   bash "$SKILL_DIR/scripts/mikuru" --format json <username>
   ```

   The launcher clones or updates `https://github.com/p1atdev/mikuru.git` in
   a temporary cache, installs locked dependencies, builds the executable, and
   then forwards all arguments. Network access is required on the first run
   and when checking for updates.

3. Pass multiple usernames as positionals. Limit services by repeating
   `--site <id-or-name>`. Add `--all` only when complete diagnostics are
   needed.

## Interpret

- Report `found` results with `profileUrl`.
- Treat `not_found` as no matching account, not proof that registration is
  available.
- Treat `invalid`, `blocked`, `unknown`, and `error` as inconclusive or
  non-matching. Never report them as found.
- State that matching usernames do not prove common ownership.

If the launcher reports that Git or Bun is missing, explain that prerequisite
instead of attempting an unrelated fallback.
