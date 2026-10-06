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
import { walkthroughs } from "./walkthroughs";
import { extraWeeks } from "./extra";
import { ROLE_PATCHES } from "./roles";
import type { WeekInput } from "@/lib/curriculum";

export const weekModules = [w01, w02, w03, w04, w05, w06, w07, w08, w09, w10, w11, w12, w13, w14, w15, w16];

const byWeek = (id: string) => Number(id.slice(1, 3)) * 10 + Number(id.slice(5, 7));

/** All topics in chronological order (week, then day, base topics before extras on the same day). */
export const rawTopics = [...weekModules.flatMap((m) => m.topics), ...extraWeeks.flatMap((e) => e.topics)]
  .map((t, i) => ({ t, i }))
  .sort((a, b) => byWeek(a.t.id) - byWeek(b.t.id) || a.i - b.i)
  .map(({ t }) => {
    const roles = ROLE_PATCHES[t.id] ? [...new Set([...t.roles, ...ROLE_PATCHES[t.id]!])] : t.roles;
    const implementation = t.implementation && walkthroughs[t.id] ? { ...t.implementation, walkthrough: walkthroughs[t.id] } : t.implementation;
    return { ...t, roles, ...(implementation ? { implementation } : {}) };
  });

const additions = extraWeeks.flatMap((e) => e.schedule);
const weekOf = (id: string) => Number(id.slice(1, 3));

/**
 * Weeks with extra topics scheduled onto their anchor days (topic ids, tasks and minutes).
 * A week's domains and roles also gain those of every topic it now teaches.
 */
export const rawWeeks: WeekInput[] = weekModules.map((m) => {
  const taught = rawTopics.filter((t) => weekOf(t.id) === m.week.number);
  return {
    ...m.week,
    domains: [...new Set([...m.week.domains, ...taught.map((t) => t.domain)])],
    roles: [...new Set([...m.week.roles, ...taught.flatMap((t) => t.roles)])],
    days: m.week.days.map((d) => {
      const extra = additions.filter((a) => a.dayId === d.id);
      if (!extra.length) return d;
      const tasks = [...d.tasks, ...extra.flatMap((a) => a.tasks)];
      return { ...d, topicIds: [...(d.topicIds ?? []), ...extra.map((a) => a.topicId)], tasks, minutes: tasks.reduce((n, t) => n + t.minutes, 0) };
    }),
  };
});
