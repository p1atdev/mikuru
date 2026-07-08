import type { HtmlCondition } from "../types.ts";

export interface HtmlInspection {
  count: number;
  text: string;
  attributes: Array<string | null>;
}

export async function inspectHtml(html: string, condition: HtmlCondition): Promise<HtmlInspection> {
  let count = 0;
  let text = "";
  const attributes: Array<string | null> = [];

  const rewriter = new HTMLRewriter().on(condition.selector, {
    element(element) {
      count += 1;
      if (condition.attribute) {
        attributes.push(element.getAttribute(condition.attribute.name));
      }
    },
    text(chunk) {
      text += chunk.text;
    },
  });

  const transformed = rewriter.transform(
    new Response(html, {
      headers: { "content-type": "text/html;charset=utf-8" },
    }),
  );
  await transformed.text();

  return { count, text, attributes };
}
