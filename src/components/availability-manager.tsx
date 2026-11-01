"use client";

import { T, Localized, translate, useLanguage } from "@/components/language";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientApi, ClientApiError } from "./client-api";
import { Button } from "./ui/button";
type Period = {
  id: string;
  catalogSlug: string;
  propertyId: string | null;
  startDate: string;
  endDate: string;
  status: string;
};
export function AvailabilityManager({
  apartments,
  properties,
  periods,
  bookings,
}: {
  apartments: { slug: string; title: string }[];
  properties: { id: string; name: string }[];
  periods: Period[];
  bookings: {
    id: string;
    propertyId: string;
    propertyName: string;
    startDate: string;
    endDate: string;
    status: "reserved";
  }[];
}) {
  const router = useRouter();
  const language = useLanguage();
  const [selectedProperty, setSelectedProperty] = useState("");
  const visibleBookings = bookings.filter(
    (booking) => !selectedProperty || booking.propertyId === selectedProperty,
  );
  const visiblePeriods = periods.filter(
    (period) => !selectedProperty || period.propertyId === selectedProperty,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<Record<
    string,
    FormDataEntryValue
  > | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  async function addPeriod(
    values: Record<string, FormDataEntryValue>,
    confirmOverlap = false,
  ) {
    setBusy(true);
    setError("");
    try {
      await clientApi("/api/availability", "POST", {
        ...values,
        ...(confirmOverlap ? { confirmOverlap: true } : {}),
      });
      formRef.current?.reset();
      setPendingPeriod(null);
      router.refresh();
    } catch (e) {
      if (e instanceof ClientApiError && e.code === "BOOKING_OVERLAP") {
        setPendingPeriod(values);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await clientApi("/api/availability", "DELETE", { id });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1 className="text-2xl">
        {" "}
        <T text="Занятость квартир" />{" "}
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        {" "}
        <T text="Гости видят только даты и статус. Ручные отметки занимают дни целиком. Для договоров учитываются время и два часа на уборку." />{" "}
      </p>
      <div className="mt-6 max-w-md">
        <label className="label" htmlFor="availability-property-filter">
          <T text="Фильтр по квартире" />
        </label>
        <select
          id="availability-property-filter"
          className="field mt-2"
          value={selectedProperty}
          onChange={(event) => setSelectedProperty(event.target.value)}
        >
          <option value="">
            <T text="Все квартиры" />
          </option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>
      {visibleBookings.length > 0 && (
        <section
          className="mt-8"
          aria-label={translate("Брони по договорам", language)}
        >
          <h2 className="text-lg font-semibold">
            <T text="Брони по договорам" />
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            <T text="Бронь появляется после создания ссылки и исчезает при её отзыве или истечении до демоподписания. После демоподписания владелец может отменить бронь в договоре." />
          </p>
          <ul className="mt-4 space-y-3">
            {visibleBookings.map((booking) => (
              <li
                key={booking.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
              >
                <div>
                  <p className="font-semibold">{booking.propertyName}</p>
                  <p className="mt-1">
                    {booking.startDate} — {booking.endDate} ·{" "}
                    <T text="Забронировано" />
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href={`/contracts/${booking.id}`}>
                    <T text="Открыть договор" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {visiblePeriods.length > 0 && (
        <h2 className="mt-8 text-lg font-semibold">
          <T text="Ручные отметки" />
        </h2>
      )}
      <ul className="mt-5 space-y-3">
        {visiblePeriods.map((p) => (
          <li
            key={p.id}
            className="card flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                <Localized>
                  {apartments.find((a) => a.slug === p.catalogSlug)?.title ??
                    properties.find((property) => property.id === p.propertyId)
                      ?.name ??
                    p.catalogSlug}
                </Localized>
              </p>
              <p className="mt-1">
                {p.startDate} — {p.endDate} ·{" "}
                <Localized>
                  {p.status === "occupied" ? "Занято" : "Забронировано"}
                </Localized>
              </p>
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => remove(p.id)}
            >
              {" "}
              <T text="Снять отметку" />{" "}
            </Button>
          </li>
        ))}
      </ul>
      {!visiblePeriods.length && !visibleBookings.length && (
        <p className="mt-4 text-sm text-slate-500">
          {" "}
          <Localized>
            {selectedProperty
              ? "Для выбранной квартиры отметок и броней пока нет."
              : "Отмеченных периодов пока нет. На сайте это не означает, что все даты свободны."}
          </Localized>{" "}
        </p>
      )}
      {!apartments.length ? (
        <p className="mt-5">
          {" "}
          <T text="Для ручных отметок сначала добавьте квартиру из каталога в свои объекты." />{" "}
        </p>
      ) : (
        <form
          ref={formRef}
          className="card my-6 grid gap-4 p-5 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            await addPeriod(
              Object.fromEntries(new FormData(event.currentTarget)),
            );
          }}
        >
          <fieldset
            disabled={busy || Boolean(pendingPeriod)}
            className="contents"
          >
            <label className="label">
              {" "}
              <T text="Квартира" />{" "}
              <select name="catalogSlug" className="field mt-2" required>
                {apartments.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    <Localized>{a.title}</Localized>
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              {" "}
              <T text="Статус" />{" "}
              <select name="status" className="field mt-2">
                <option value="occupied">
                  {" "}
                  <T text="Занято" />{" "}
                </option>
                <option value="reserved">
                  {" "}
                  <T text="Забронировано" />{" "}
                </option>
              </select>
            </label>
            <label className="label">
              {" "}
              <T text="Первый занятый день" />{" "}
              <input
                type="date"
                name="startDate"
                className="field mt-2"
                required
              />
            </label>
            <label className="label">
              {" "}
              <T text="Последний занятый день (включительно)" />{" "}
              <input
                type="date"
                name="endDate"
                className="field mt-2"
                required
              />
            </label>
            <Button disabled={busy} type="submit">
              {" "}
              <T text="Добавить период" />{" "}
            </Button>
          </fieldset>
        </form>
      )}
      {pendingPeriod && (
        <div role="alert" className="card my-4 p-5 text-sm">
          <p>
            <T text="Этот период пересекается с бронью по договору. Сохранить отметку?" />
          </p>
          <p className="mt-2 font-semibold">
            {String(pendingPeriod.startDate)} — {String(pendingPeriod.endDate)}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={() => addPeriod(pendingPeriod, true)}
            >
              <T text="Сохранить отметку" />
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => setPendingPeriod(null)}
            >
              <T text="Отмена" />
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="error my-4">
          <Localized>{error}</Localized>
        </p>
      )}
    </div>
  );
}
