export function interpolateTemplate(template: string, username: string): string {
  return template.replaceAll("{username}", encodeURIComponent(username));
}

export function interpolateTextTemplate(template: string, username: string): string {
  return template.replaceAll("{username}", username);
}

export function interpolateValue(value: unknown, username: string): unknown {
  if (typeof value === "string") {
    return interpolateTextTemplate(value, username);
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, username));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateValue(item, username)]),
    );
  }
  return value;
}
