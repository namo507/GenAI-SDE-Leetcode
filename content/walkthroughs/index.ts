/**
 * "Explain the code like I'm five" tours, kept beside the week files so the
 * lessons stay readable. Each step names an exact snippet of a line in the
 * Python and R programs; the contract fails the build if a snippet is missing.
 */
import type { WalkthroughStepInput } from "@/lib/curriculum";
import { walkthroughs as w01 } from "./w01-04";
import { walkthroughs as w01b } from "./w01-04b";
import { walkthroughs as w05 } from "./w05-08";
import { walkthroughs as w09 } from "./w09-12";
import { walkthroughs as w13 } from "./w13-16";

export const walkthroughs: Record<string, WalkthroughStepInput[]> = { ...w01, ...w01b, ...w05, ...w09, ...w13 };
