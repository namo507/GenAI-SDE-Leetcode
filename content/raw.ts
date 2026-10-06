/** Every week module in chronological order. Add new weeks here. */
import * as w01 from "./weeks/w01";
import * as w02 from "./weeks/w02";
import * as w03 from "./weeks/w03";
import * as w04 from "./weeks/w04";
import * as w05 from "./weeks/w05";
import * as w06 from "./weeks/w06";
import * as w07 from "./weeks/w07";
import * as w08 from "./weeks/w08";
import * as w09 from "./weeks/w09";
import * as w10 from "./weeks/w10";
import * as w11 from "./weeks/w11";
import * as w12 from "./weeks/w12";
import * as w13 from "./weeks/w13";
import * as w14 from "./weeks/w14";
import * as w15 from "./weeks/w15";
import * as w16 from "./weeks/w16";

export const weekModules = [w01, w02, w03, w04, w05, w06, w07, w08, w09, w10, w11, w12, w13, w14, w15, w16];
export const rawWeeks = weekModules.map((m) => m.week);
export const rawTopics = weekModules.flatMap((m) => m.topics);
