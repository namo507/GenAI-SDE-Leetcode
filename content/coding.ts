import type { PracticeSetInput } from "@/lib/content-types";
import { codingA } from "./coding-a";
import { codingB } from "./coding-b";

/** LeetCode-style problems, each with a Python and an R starter, reference solution and tests. */
export const codingSet: PracticeSetInput = {
  id: "coding",
  title: "Coding problems",
  description:
    "Interview-style problems grouped by pattern, each in Python and R. Edit the starter, run the tests in your browser, and open the reference solution and its plain-language explanation when you are ready. CI checks that every reference solution passes and every starter fails.",
  items: [...codingA, ...codingB],
};
