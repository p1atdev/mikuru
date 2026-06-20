import { expect, test } from "bun:test";
import { mapConcurrent } from "../src/core/concurrency.ts";

test("mapConcurrent preserves order and limits active jobs", async () => {
  let active = 0;
  let maximumActive = 0;

  const results = await mapConcurrent([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await Bun.sleep(5);
    active -= 1;
    return value * 2;
  });

  expect(results).toEqual([2, 4, 6, 8, 10]);
  expect(maximumActive).toBe(2);
});
