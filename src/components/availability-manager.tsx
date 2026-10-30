"use client";

import { T, Localized } from "@/components/language";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "./client-api";
import { Button } from "./ui/button";
type Period = {
  id: string;
  catalogSlug: string;
  startDate: string;
  endDate: string;
  status: string;
};
export function AvailabilityManager({
  apartments,
  periods,
}: {
  apartments: { slug: string; title: string }[];
  periods: Period[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
        <T text="Гости видят только даты и статус. Оба дня периода включены: день выезда не отмечайте, если квартира уже доступна. Это ориентир, а не онлайн-бронирование." />{" "}
      </p>
      {!apartments.length ? (
        <p className="mt-5">
          {" "}
          <T text="Сначала добавьте квартиру каталога в свои объекты." />{" "}
        </p>
      ) : (
        <form
          className="card my-6 grid gap-4 p-5 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            setBusy(true);
            setError("");
            try {
              await clientApi(
                "/api/availability",
                "POST",
                Object.fromEntries(values),
              );
              form.reset();
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
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
            <input type="date" name="endDate" className="field mt-2" required />
          </label>
          <Button disabled={busy} type="submit">
            {" "}
            <T text="Добавить период" />{" "}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="error my-4">
          <Localized>{error}</Localized>
        </p>
      )}
      <ul className="mt-5 space-y-3">
        {periods.map((p) => (
          <li
            key={p.id}
            className="card flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                <Localized>
                  {apartments.find((a) => a.slug === p.catalogSlug)?.title ??
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
      {!periods.length && (
        <p className="mt-4 text-sm text-slate-500">
          {" "}
          <T text="Отмеченных периодов пока нет. На сайте это не означает, что все даты свободны." />{" "}
        </p>
      )}
    </div>
  );
}
