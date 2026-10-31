"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarMonth,
  dayStatus,
  type PublicAvailability,
} from "@/lib/availability";
import { T, translate, useLanguage } from "./language";
import { clientApi } from "./client-api";

const dayStyles = {
  occupied: {
    label: "Занято",
    symbol: "×",
    className: "bg-rose-50 text-rose-900 border-rose-100",
  },
  reserved: {
    label: "Забронировано",
    symbol: "◇",
    className: "bg-amber-50 text-amber-950 border-amber-200/70",
  },
  unknown: {
    label: "Нет отметки",
    symbol: "—",
    className: "bg-stone-50 text-stone-600 border-stone-100",
  },
} as const;

function kazakhstanDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Almaty",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}

export function AvailabilityCalendar({ slug }: { slug: string }) {
  const language = useLanguage();
  const [month, setMonth] = useState(() => calendarMonth());
  const [today] = useState(() => kazakhstanDate(new Date()));
  const [ranges, setRanges] = useState<PublicAvailability[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    clientApi<PublicAvailability[]>(
      `/api/availability?apartment=${encodeURIComponent(slug)}`,
    )
      .then((data) => {
        if (active) setRanges(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const startOffset = (month.getUTCDay() + 6) % 7;
  const count = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const weekCount = Math.ceil((startOffset + count) / 7);
  const locale =
    language === "kk" ? "kk-KZ" : language === "en" ? "en-GB" : "ru-RU";
  const kazakhMonths = [
    "қаңтар",
    "ақпан",
    "наурыз",
    "сәуір",
    "мамыр",
    "маусым",
    "шілде",
    "тамыз",
    "қыркүйек",
    "қазан",
    "қараша",
    "желтоқсан",
  ];
  const kazakhWeekdays = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"];
  const monthLabel =
    language === "kk"
      ? `${kazakhMonths[month.getUTCMonth()]} ${month.getUTCFullYear()}`
      : new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(month);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function moveMonth(offset: number) {
    setMonth(
      (current) =>
        new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1),
        ),
    );
  }

  return (
    <section
      className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6"
      aria-label={translate("Календарь занятости", language)}
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
        <CalendarDays
          size={20}
          className="shrink-0 text-amber-800"
          aria-hidden="true"
        />
        <T text="Календарь занятости" />
      </h2>
      <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">
        <T text="Неотмеченные даты не гарантируют доступность. Уточняйте у владельца." />
      </p>
      {error ? (
        <p role="alert" className="error mt-4">
          <T text="Не удалось загрузить календарь" />
        </p>
      ) : !ranges ? (
        <div
          role="status"
          aria-label={translate("Загрузка календаря", language)}
          className="mt-5 grid grid-cols-7 gap-1.5"
          aria-busy="true"
        >
          {Array.from({ length: 35 }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="h-12 rounded-lg bg-stone-100 motion-safe:animate-pulse"
            />
          ))}
          <span className="sr-only">
            <T text="Загрузка календаря" />
          </span>
        </div>
      ) : (
        <>
          <div className="my-4 flex items-center justify-between gap-2 rounded-xl bg-stone-50 p-1">
            <button
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-stone-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
              aria-label={translate("Предыдущий месяц", language)}
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <p
              aria-live="polite"
              className="text-center text-sm font-semibold capitalize text-stone-900"
            >
              {monthLabel}
            </p>
            <button
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg text-stone-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
              aria-label={translate("Следующий месяц", language)}
              onClick={() => moveMonth(1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <table
            className="w-full table-fixed border-separate border-spacing-1 text-center text-xs sm:border-spacing-1.5"
            aria-label={monthLabel}
          >
            <thead>
              <tr>
                {Array.from({ length: 7 }, (_, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="pb-2 font-medium text-stone-500"
                  >
                    {language === "kk"
                      ? kazakhWeekdays[index]
                      : new Intl.DateTimeFormat(locale, {
                          weekday: "short",
                          timeZone: "UTC",
                        }).format(new Date(Date.UTC(2026, 0, 5 + index)))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: weekCount }, (_, week) => (
                <tr key={week}>
                  {Array.from({ length: 7 }, (_, weekday) => {
                    const number = week * 7 + weekday - startOffset + 1;
                    if (number < 1 || number > count)
                      return <td key={weekday} />;
                    const date = new Date(
                      Date.UTC(
                        month.getUTCFullYear(),
                        month.getUTCMonth(),
                        number,
                      ),
                    );
                    const day = date.toISOString().slice(0, 10);
                    const style = dayStyles[dayStatus(day, ranges)];
                    const isToday = day === today;
                    const dateLabel =
                      language === "kk"
                        ? `${number} ${kazakhMonths[month.getUTCMonth()]} ${month.getUTCFullYear()}`
                        : dateFormatter.format(date);
                    const accessibleLabel = `${dateLabel}: ${translate(style.label, language)}${isToday ? ` · ${translate("Сегодня", language)}` : ""}`;
                    return (
                      <td
                        key={weekday}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={accessibleLabel}
                        title={accessibleLabel}
                        className={`h-12 rounded-lg border align-middle sm:h-14 ${style.className} ${isToday ? "outline-2 -outline-offset-2 outline-amber-800" : ""}`}
                      >
                        <span
                          className={`block text-sm ${isToday ? "font-bold" : "font-medium"}`}
                        >
                          {number}
                        </span>
                        <span
                          aria-hidden="true"
                          className="mt-0.5 block text-[10px] leading-3"
                        >
                          {style.symbol}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-600">
            {Object.values(dayStyles).map((style) => (
              <span
                key={style.label}
                className="inline-flex items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-5 shrink-0 place-items-center rounded border ${style.className}`}
                >
                  {style.symbol}
                </span>
                <T text={style.label} />
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-4 rounded border-2 border-amber-800"
              />
              <T text="Сегодня" />
            </span>
          </div>
        </>
      )}
    </section>
  );
}
