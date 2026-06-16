---
name: mikuru
description: Check whether one or more usernames have public accounts across Mikuru's supported sites. Use when a user asks to search for a username, find matching public profiles or accounts, investigate username reuse, or check selected services.
---

# Mikuru

Use the bundled `scripts/mikuru` launcher. It runs `assets/mikuru.js` with Bun
and forwards CLI arguments.

## Run

Resolve `SKILL_DIR` as the directory containing this `SKILL.md`.

Prefer JSON when using results in an agent response:

```bash
bash "$SKILL_DIR/scripts/mikuru" --format json <username>
```

Use `--short` for quick human-readable text output:

```bash
bash "$SKILL_DIR/scripts/mikuru" --short <username>
```

`--short` only affects text output. It disables interactive progress and rich
tables, then prints simple text. Prefer `--format json` for structured parsing.

Examples:

```bash
bash "$SKILL_DIR/scripts/mikuru" --format json alice bob
bash "$SKILL_DIR/scripts/mikuru" --format json --site github --site instagram alice
bash "$SKILL_DIR/scripts/mikuru" --format json --all alice
bash "$SKILL_DIR/scripts/mikuru" --short --site github alice
```

Pass multiple usernames as positionals. Limit services by repeating
`--site <id-or-name>`. Add `--all` when non-matches and inconclusive statuses
are needed.

## Interpret

- Report only `found` results as matching accounts, and include `profileUrl`.
- Treat `not_found` as no matching account, not proof that registration is available.
- Treat `invalid`, `blocked`, `unknown`, and `error` as inconclusive or non-matching.
  Never report them as found.
- State that matching usernames do not prove common ownership.

If the launcher reports that Bun is missing, explain that prerequisite instead
of attempting an unrelated fallback.
