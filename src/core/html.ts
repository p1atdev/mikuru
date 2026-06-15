import type { HtmlCondition } from "../types.ts";

export interface HtmlInspection {
  count: number;
  text: string;
  attributes: Array<string | null>;
}

export function inspectHtml(
  html: string,
  condition: HtmlCondition,
): HtmlInspection {
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

  rewriter.transform(html);
  return { count, text, attributes };
}
