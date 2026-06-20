import { describe, expect, test } from "bun:test";
import { evaluateResponse, responseNeedsBody } from "../src/core/evaluate";
import type { ProbeResponse, Rule } from "../src/types";

function response(overrides: Partial<ProbeResponse> = {}): ProbeResponse {
  return {
    status: 200,
    url: "https://example.com/alice",
    headers: new Headers(),
    durationMs: 1,
    ...overrides,
  };
}

describe("response evaluation", () => {
  test("matches status ranges and preserves rule evidence", () => {
    const rules: Rule[] = [
      {
        result: "found",
        reason: "successful response",
        when: {
          all: [{ type: "status", between: [200, 299] }],
        },
      },
    ];

    expect(evaluateResponse(response(), rules, [])).toEqual({
      status: "found",
      evidence: {
        rule: 0,
        result: "found",
        reason: "successful response",
      },
    });
  });

  test("supports all, any, and not", () => {
    const rules: Rule[] = [
      {
        result: "found",
        when: {
          all: [{ type: "status", in: [200] }],
          any: [
            { type: "header", name: "x-user", equals: "alice" },
            { type: "url", includes: "/alice" },
          ],
          not: [{ type: "body", includes: "not found" }],
        },
      },
    ];

    expect(evaluateResponse(response({ body: "profile" }), rules, []).status).toBe("found");
  });

  test("evaluates JSON paths and deep equality", () => {
    const rules: Rule[] = [
      {
        result: "not_found",
        when: {
          all: [{ type: "json", path: ["users"], equals: [] }],
        },
      },
    ];

    expect(
      evaluateResponse(response({ body: JSON.stringify({ users: [] }) }), rules, []).status,
    ).toBe("not_found");
  });

  test("evaluates HTML selectors, text, and attributes", () => {
    const rules: Rule[] = [
      {
        result: "found",
        when: {
          all: [
            {
              type: "html",
              selector: "main.profile[data-user]",
              exists: true,
              text: { includes: "Alice" },
              attribute: {
                name: "data-user",
                value: { equals: "alice" },
              },
            },
          ],
        },
      },
    ];

    const body = '<main class="profile" data-user="alice">Alice Smith</main>';
    expect(evaluateResponse(response({ body }), rules, []).status).toBe("found");
  });

  test("marks configured statuses and WAF pages as blocked", () => {
    expect(evaluateResponse(response({ status: 429 }), [], [429]).status).toBe("blocked");
    expect(
      evaluateResponse(response({ body: '<span id="challenge-error-text">blocked</span>' }), [], [])
        .status,
    ).toBe("blocked");
  });

  test("returns unknown when no rule matches", () => {
    expect(evaluateResponse(response({ status: 418 }), [], []).status).toBe("unknown");
  });

  test("detects whether a request needs a body", () => {
    expect(
      responseNeedsBody([
        {
          result: "found",
          when: { all: [{ type: "status", in: [200] }] },
        },
      ]),
    ).toBeFalse();
    expect(
      responseNeedsBody([
        {
          result: "found",
          when: { all: [{ type: "body", includes: "profile" }] },
        },
      ]),
    ).toBeTrue();
  });
});
