import type { TopicInput } from "@/lib/curriculum";

/** Schedules an extra topic on its anchor day: the topic id joins the day and its tasks extend the day's plan. */
export type DayAddition = { dayId: string; topicId: string; tasks: { label: string; minutes: number }[] };
export type ExtraWeek = { topics: TopicInput[]; schedule: DayAddition[] };
