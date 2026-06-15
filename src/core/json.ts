export interface JsonPathResult {
  exists: boolean;
  value: unknown;
}

export function getJsonPath(
  root: unknown,
  path: Array<string | number>,
): JsonPathResult {
  let current = root;

  for (const segment of path) {
    if (current === null || typeof current !== "object") {
      return { exists: false, value: undefined };
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return { exists: false, value: undefined };
    }
    current = (current as Record<string | number, unknown>)[segment];
  }

  return { exists: true, value: current };
}

export function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (typeof left !== typeof right || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => deepEqual(value, right[index]));
  }
  if (typeof left === "object" && typeof right === "object") {
    const leftEntries = Object.entries(left);
    const rightRecord = right as Record<string, unknown>;
    if (leftEntries.length !== Object.keys(rightRecord).length) {
      return false;
    }
    return leftEntries.every(
      ([key, value]) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        deepEqual(value, rightRecord[key]),
    );
  }
  return false;
}
