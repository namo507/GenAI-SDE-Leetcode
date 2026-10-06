/** Topics added after the first release, one module per week, merged by content/raw.ts. */
import type { ExtraWeek } from "./types";
import { w01 } from "./w01";
import { w02 } from "./w02";
import { w03 } from "./w03";
import { w04 } from "./w04";

export const extraWeeks: ExtraWeek[] = [w01, w02, w03, w04];
