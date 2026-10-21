import Link from "next/link";
import { CircleCheck, CircleDot, Clock } from "lucide-react";
import { DAY_KIND_LABELS } from "@/lib/curriculum";
import type { CatalogDay } from "@/lib/catalog";

export type DayStatus = "done" | "active" | "none";

export function DayTile({ day, status, today }: { day: CatalogDay; status: DayStatus; today: boolean }) {
  return (
    <Link href={day.href} className="tp-day" data-status={status} data-today={today} aria-current={today ? "date" : undefined}>
      <span className="tp-day__top">
        <span className="tp-day__num">D{day.day}</span>
        <span className="tp-day__status inline-flex items-center gap-1 t-caption">
          {status === "done" && <CircleCheck className="tp-icon" aria-hidden />}
          {status === "active" && <CircleDot className="tp-icon" aria-hidden />}
          {today && <span className="font-semibold text-brand">Today</span>}
          <span className="tp-sr-only">{status === "done" ? "Done" : status === "active" ? "In progress" : "Not started"}</span>
        </span>
      </span>
      <span className="tp-day__kind">{day.label ?? DAY_KIND_LABELS[day.kind]}</span>
      <span className="tp-day__title">{day.title}</span>
      <span className="tp-day__meta">
        <Clock className="tp-icon" aria-hidden />
        {day.minutes} min
      </span>
    </Link>
  );
}
