export function parseUsernames(input: string): string[] {
  const seen = new Set<string>();
  const usernames: string[] = [];

  for (const value of input.split(/[\s,]+/)) {
    const username = value.trim();
    if (username && !seen.has(username)) {
      seen.add(username);
      usernames.push(username);
    }
  }

  return usernames;
}

export function parseOptionalPositiveInteger(
  input: string,
  label: string,
): { ok: true; value: number | undefined } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: true, value: undefined };
  }

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) {
    return { ok: false, error: `${label} must be a positive integer.` };
  }

  return { ok: true, value };
}
