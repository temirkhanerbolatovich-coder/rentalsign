"use client";

import { useEffect, useState } from "react";
import { dayStatus, type PublicAvailability } from "@/lib/availability";
import { T, translate, useLanguage } from "./language";
import { clientApi } from "./client-api";
export function AvailabilityCalendar({ slug }: { slug: string }) {
  const language = useLanguage();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  });
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
  const locale =
    language === "kk" ? "kk-KZ" : language === "en" ? "en-GB" : "ru-RU";
  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      aria-label={translate("Календарь занятости", language)}
    >
      <h2 className="text-lg font-semibold">
        <T text="Календарь занятости" />
      </h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        <T text="Неотмеченные даты не гарантируют доступность. Уточняйте у владельца." />
      </p>
      {error ? (
        <p role="alert" className="error mt-3">
          <T text="Не удалось загрузить календарь" />
        </p>
      ) : !ranges ? (
        <p role="status" className="mt-3">
          …
        </p>
      ) : (
        <>
          <div className="my-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-lg hover:bg-amber-50"
              aria-label={translate("Предыдущий месяц", language)}
              onClick={() =>
                setMonth(
                  new Date(
                    Date.UTC(
                      month.getUTCFullYear(),
                      month.getUTCMonth() - 1,
                      1,
                    ),
                  ),
                )
              }
            >
              ←
            </button>
            <p aria-live="polite" className="text-sm font-semibold capitalize">
              {new Intl.DateTimeFormat(locale, {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(month)}
            </p>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-lg hover:bg-amber-50"
              aria-label={translate("Следующий месяц", language)}
              onClick={() =>
                setMonth(
                  new Date(
                    Date.UTC(
                      month.getUTCFullYear(),
                      month.getUTCMonth() + 1,
                      1,
                    ),
                  ),
                )
              }
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={`weekday-${i}`} className="py-2 text-slate-500">
                {new Intl.DateTimeFormat(locale, {
                  weekday: "short",
                  timeZone: "UTC",
                }).format(new Date(Date.UTC(2026, 0, 5 + i)))}
              </span>
            ))}
            {Array.from({ length: startOffset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const day = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
              const status = dayStatus(day, ranges);
              const name =
                status === "occupied"
                  ? "Занято"
                  : status === "reserved"
                    ? "Забронировано"
                    : "Нет отметки";
              return (
                <span
                  key={day}
                  title={`${day}: ${translate(name, language)}`}
                  aria-label={`${day}: ${translate(name, language)}`}
                  className={`rounded-lg py-2.5 ${status === "occupied" ? "bg-rose-100 font-semibold text-rose-900" : status === "reserved" ? "bg-amber-100 font-semibold text-amber-950" : "bg-slate-50 text-slate-600"}`}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {[
              ["Занято", "bg-rose-100"],
              ["Забронировано", "bg-amber-100"],
              ["Нет отметки", "bg-slate-100"],
            ].map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`size-3 rounded ${color}`}
                />
                <T text={label} />
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
