/**
 * "Explain the code like I'm five" tours, kept beside the week files so the
 * lessons stay readable. Each step names an exact snippet of a line in the
 * Python and R programs; the contract fails the build if a snippet is missing.
 */
import type { WalkthroughStepInput } from "@/lib/curriculum";
import { walkthroughs as w01 } from "./w01-04";

export const walkthroughs: Record<string, WalkthroughStepInput[]> = { ...w01 };
