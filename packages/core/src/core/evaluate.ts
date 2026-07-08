import { inspectHtml, type HtmlInspection } from "./html.ts";
import { deepEqual, getJsonPath } from "./json.ts";
import type {
  Condition,
  ConditionGroup,
  HtmlCondition,
  ProbeResponse,
  Rule,
  RuleEvidence,
  RuleResult,
  StringMatcher,
} from "../types.ts";

interface EvaluationContext {
  response: ProbeResponse;
  jsonParsed: boolean;
  json: unknown;
  html: Map<string, HtmlInspection>;
}

export interface EvaluationResult {
  status: RuleResult;
  evidence?: RuleEvidence;
}

export function responseNeedsBody(rules: Rule[]): boolean {
  return rules.some((rule) =>
    groupConditions(rule.when).some(
      (condition) =>
        condition.type === "body" || condition.type === "json" || condition.type === "html",
    ),
  );
}

export async function evaluateResponse(
  response: ProbeResponse,
  rules: Rule[],
  blockedStatuses: number[],
): Promise<EvaluationResult> {
  if (blockedStatuses.includes(response.status)) {
    return { status: "blocked" };
  }
  if (looksLikeWaf(response.body)) {
    return { status: "blocked" };
  }

  const context: EvaluationContext = {
    response,
    jsonParsed: false,
    json: undefined,
    html: new Map(),
  };

  for (const [index, rule] of rules.entries()) {
    if (await matchesGroup(rule.when, context)) {
      return {
        status: rule.result,
        evidence: {
          rule: index,
          result: rule.result,
          reason: rule.reason,
        },
      };
    }
  }

  return { status: "unknown" };
}

async function matchesGroup(group: ConditionGroup, context: EvaluationContext): Promise<boolean> {
  const all = group.all ?? [];
  const any = group.any ?? [];
  const not = group.not ?? [];

  for (const condition of all) {
    if (!(await matchesCondition(condition, context))) {
      return false;
    }
  }

  if (any.length > 0) {
    let matched = false;
    for (const condition of any) {
      if (await matchesCondition(condition, context)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      return false;
    }
  }

  for (const condition of not) {
    if (await matchesCondition(condition, context)) {
      return false;
    }
  }

  return true;
}

async function matchesCondition(
  condition: Condition,
  context: EvaluationContext,
): Promise<boolean> {
  switch (condition.type) {
    case "status":
      return (
        (condition.in?.includes(context.response.status) ?? false) ||
        (condition.between !== undefined &&
          condition.between[0] <= context.response.status &&
          context.response.status <= condition.between[1])
      );
    case "url":
      return matchesString(context.response.url, condition);
    case "header":
      return matchesString(context.response.headers.get(condition.name) ?? "", condition);
    case "body":
      return context.response.body !== undefined && matchesString(context.response.body, condition);
    case "json":
      return matchesJson(condition, context);
    case "html":
      return matchesHtml(condition, context);
  }
}

function matchesJson(
  condition: Extract<Condition, { type: "json" }>,
  context: EvaluationContext,
): boolean {
  if (!context.jsonParsed) {
    context.jsonParsed = true;
    try {
      context.json = JSON.parse(context.response.body ?? "");
    } catch {
      context.json = undefined;
    }
  }

  const selected = getJsonPath(context.json, condition.path);
  if (condition.exists !== undefined && selected.exists !== condition.exists) {
    return false;
  }
  if (condition.equals !== undefined && !deepEqual(selected.value, condition.equals)) {
    return false;
  }
  if (condition.includes !== undefined && !String(selected.value).includes(condition.includes)) {
    return false;
  }
  return true;
}

async function matchesHtml(condition: HtmlCondition, context: EvaluationContext): Promise<boolean> {
  if (context.response.body === undefined) {
    return false;
  }

  const cacheKey = JSON.stringify(condition);
  let inspection = context.html.get(cacheKey);
  if (!inspection) {
    inspection = await inspectHtml(context.response.body, condition);
    context.html.set(cacheKey, inspection);
  }

  if (condition.exists !== undefined) {
    if (inspection.count > 0 !== condition.exists) {
      return false;
    }
  }
  if (condition.text && !matchesString(inspection.text, condition.text)) {
    return false;
  }
  if (condition.attribute) {
    if (inspection.attributes.length === 0) {
      return false;
    }
    if (
      condition.attribute.value &&
      !inspection.attributes.some(
        (value) => value !== null && matchesString(value, condition.attribute!.value!),
      )
    ) {
      return false;
    }
  }
  return true;
}

function matchesString(value: string, matcher: StringMatcher): boolean {
  const caseSensitive = matcher.caseSensitive ?? true;
  const normalizedValue = caseSensitive ? value : value.toLocaleLowerCase();
  const normalize = (input: string) => (caseSensitive ? input : input.toLocaleLowerCase());

  if (matcher.equals !== undefined && normalizedValue !== normalize(matcher.equals)) {
    return false;
  }

  if (matcher.includes !== undefined) {
    const needles = Array.isArray(matcher.includes) ? matcher.includes : [matcher.includes];
    if (!needles.some((needle) => normalizedValue.includes(normalize(needle)))) {
      return false;
    }
  }

  if (matcher.matches !== undefined) {
    const flags = caseSensitive ? "" : "i";
    if (!new RegExp(matcher.matches, flags).test(value)) {
      return false;
    }
  }

  return true;
}

function groupConditions(group: ConditionGroup): Condition[] {
  return [...(group.all ?? []), ...(group.any ?? []), ...(group.not ?? [])];
}

function looksLikeWaf(body: string | undefined): boolean {
  if (!body) {
    return false;
  }
  const fingerprints = [
    '<span id="challenge-error-text">',
    "AwsWafIntegration.forceRefreshToken",
    "cf-chl-",
    "Attention Required! | Cloudflare",
  ];
  return fingerprints.some((fingerprint) => body.includes(fingerprint));
}
