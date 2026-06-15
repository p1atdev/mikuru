import * as v from "valibot";
import type { Manifest } from "../types.ts";

const nonEmptyString = v.pipe(v.string(), v.nonEmpty());
const positiveInteger = v.pipe(v.number(), v.integer(), v.minValue(1));
const statusCode = v.pipe(v.number(), v.integer(), v.minValue(100), v.maxValue(599));
const stringOrStrings = v.union([nonEmptyString, v.pipe(v.array(nonEmptyString), v.nonEmpty())]);

const stringMatcherEntries = {
  equals: v.optional(v.string()),
  includes: v.optional(stringOrStrings),
  matches: v.optional(nonEmptyString),
  caseSensitive: v.optional(v.boolean()),
};

const statusCondition = v.strictObject({
  type: v.literal("status"),
  in: v.optional(v.pipe(v.array(statusCode), v.nonEmpty())),
  between: v.optional(v.tuple([statusCode, statusCode])),
});

const urlCondition = v.strictObject({
  type: v.literal("url"),
  ...stringMatcherEntries,
});

const headerCondition = v.strictObject({
  type: v.literal("header"),
  name: nonEmptyString,
  ...stringMatcherEntries,
});

const bodyCondition = v.strictObject({
  type: v.literal("body"),
  ...stringMatcherEntries,
});

const jsonCondition = v.strictObject({
  type: v.literal("json"),
  path: v.array(v.union([v.string(), v.pipe(v.number(), v.integer(), v.minValue(0))])),
  exists: v.optional(v.boolean()),
  equals: v.optional(v.unknown()),
  includes: v.optional(v.string()),
});

const htmlCondition = v.strictObject({
  type: v.literal("html"),
  selector: nonEmptyString,
  exists: v.optional(v.boolean()),
  text: v.optional(v.strictObject(stringMatcherEntries)),
  attribute: v.optional(
    v.strictObject({
      name: nonEmptyString,
      value: v.optional(v.strictObject(stringMatcherEntries)),
    }),
  ),
});

const condition = v.variant("type", [
  statusCondition,
  urlCondition,
  headerCondition,
  bodyCondition,
  jsonCondition,
  htmlCondition,
]);

const rule = v.strictObject({
  result: v.picklist(["found", "not_found", "blocked", "unknown"]),
  reason: v.optional(nonEmptyString),
  when: v.strictObject({
    all: v.optional(v.array(condition)),
    any: v.optional(v.array(condition)),
    not: v.optional(v.array(condition)),
  }),
});

const request = v.strictObject({
  url: v.optional(nonEmptyString),
  method: v.optional(v.picklist(["GET", "HEAD", "POST", "PUT"])),
  redirects: v.optional(v.picklist(["follow", "manual", "error"])),
  timeoutMs: v.optional(positiveInteger),
  headers: v.optional(v.record(nonEmptyString, v.string())),
  json: v.optional(v.unknown()),
});

const site = v.strictObject({
  id: v.pipe(nonEmptyString, v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  name: nonEmptyString,
  profileUrl: nonEmptyString,
  enabled: v.optional(v.boolean()),
  tags: v.optional(v.array(nonEmptyString)),
  username: v.optional(
    v.strictObject({
      pattern: v.optional(nonEmptyString),
    }),
  ),
  request,
  blockedStatuses: v.optional(v.array(statusCode)),
  rules: v.pipe(v.array(rule), v.nonEmpty()),
  test: v.optional(
    v.strictObject({
      found: nonEmptyString,
      notFoundTemplate: v.optional(nonEmptyString),
    }),
  ),
});

export const manifestSchema: v.GenericSchema<Manifest> = v.strictObject({
  version: v.literal(1),
  defaults: v.optional(
    v.strictObject({
      concurrency: v.optional(positiveInteger),
      timeoutMs: v.optional(positiveInteger),
      headers: v.optional(v.record(nonEmptyString, v.string())),
      blockedStatuses: v.optional(v.array(statusCode)),
    }),
  ),
  sites: v.pipe(v.array(site), v.nonEmpty()),
});
