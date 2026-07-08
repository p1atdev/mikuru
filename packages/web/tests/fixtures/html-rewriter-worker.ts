import { evaluateResponse } from "core/src/core/evaluate";
import type { ProbeResponse, Rule } from "core/src/types";

const rules: Rule[] = [
  {
    result: "found",
    reason: "profile metadata matched",
    when: {
      all: [
        { type: "status", in: [200] },
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

export default {
  async fetch(): Promise<Response> {
    const response: ProbeResponse = {
      status: 200,
      url: "https://example.com/alice",
      headers: new Headers(),
      body: '<main class="profile" data-user="alice">Alice Smith</main>',
      durationMs: 1,
    };

    return Response.json(await evaluateResponse(response, rules, []));
  },
};
