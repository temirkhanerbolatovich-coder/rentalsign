"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  MapPin,
  Pencil,
  Archive,
  RotateCcw,
  DoorOpen,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { ConfirmAction } from "./confirm-action";
import { PageTitle } from "./page-title";
import { clientApi } from "./client-api";
import { money, propertyTypes } from "@/domain/contracts";
import { propertySchema, type PropertyInput } from "@/validation/schemas";
type PropertyRow = PropertyInput & { id: string; archived: boolean };
export function PropertiesManager({
  properties,
}: {
  properties: PropertyRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  function edit(property: PropertyRow | null) {
    setEditing(property);
    setError("");
    setOpen(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(form.entries());
    const parsed = propertySchema.safeParse({
      ...input,
      rent: Number(input.rent),
      deposit: Number(input.deposit),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setBusy(false);
      return;
    }
    try {
      await clientApi(
        editing ? `/api/properties/${editing.id}` : "/api/properties",
        editing ? "PATCH" : "POST",
        parsed.data,
      );
      setOpen(false);
      setMessage(editing ? "Объект обновлён" : "Объект создан");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function archive(property: PropertyRow) {
    await clientApi(`/api/properties/${property.id}`, "PATCH", {
      archived: !property.archived,
    });
    setMessage(
      property.archived ? "Объект восстановлен" : "Объект архивирован",
    );
    router.refresh();
  }
  const visible = properties.filter((p) => showArchive || !p.archived);
  return (
    <>
      <PageTitle
        title="Объекты недвижимости"
        description="Сохраните адреса и цены — они будут под рукой при создании договора."
      >
        <Button onClick={() => edit(null)}>
          <Plus />
          Добавить объект
        </Button>
      </PageTitle>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {properties.filter((p) => !p.archived).length} действующих объектов
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={showArchive}
            onChange={(e) => setShowArchive(e.target.checked)}
            className="size-4 accent-teal-700"
          />
          Показать архив
        </label>
      </div>
      {message && (
        <p role="status" className="success mb-5">
          {message}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((property) => (
          <article
            key={property.id}
            className={`card flex flex-col overflow-hidden ${property.archived ? "opacity-70" : ""}`}
          >
            <div className="flex h-24 items-center justify-between bg-gradient-to-br from-[#e5eeeb] to-[#f3f6f5] px-6">
              <Building2
                className="text-teal-700/60"
                size={35}
                strokeWidth={1.3}
              />
              <span className="rounded-md bg-white/70 px-3 py-1 text-[11px] text-teal-800">
                {property.archived ? "В архиве" : propertyTypes[property.type]}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h2 className="text-base font-semibold">{property.name}</h2>
              <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                {property.address}
              </p>
              {property.unit && (
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <DoorOpen size={15} />
                  Помещение {property.unit}
                </p>
              )}
              <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500">
                {property.description || "Описание не добавлено"}
              </p>
              <div className="mt-auto grid grid-cols-2 gap-4 pt-6">
                <div>
                  <p className="text-[10px] text-slate-400">СТОИМОСТЬ АРЕНДЫ</p>
                  <p className="mt-1 text-base font-semibold">
                    {money(property.rent)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">ДЕПОЗИТ</p>
                  <p className="mt-1 text-base font-semibold">
                    {money(property.deposit)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
              <Button size="sm" variant="ghost" onClick={() => edit(property)}>
                <Pencil />
                Изменить
              </Button>
              <ConfirmAction
                title={
                  property.archived
                    ? "Восстановить объект?"
                    : "Архивировать объект?"
                }
                description="Существующие договоры и их снимки сохранятся. Архивный объект нельзя выбрать для нового договора."
                label={property.archived ? "Восстановить" : "Архивировать"}
                trigger={
                  <>
                    {property.archived ? <RotateCcw /> : <Archive />}
                    {property.archived ? "Восстановить" : "В архив"}
                  </>
                }
                onConfirm={() => archive(property)}
              />
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="card py-20 text-center">
          <Building2 size={36} className="mx-auto mb-4 text-slate-300" />
          <p className="font-medium">Добавьте первый объект</p>
          <p className="mt-2 text-sm text-slate-500">
            Квартиру, апартаменты или гостиничный номер.
          </p>
          <Button className="mt-5" onClick={() => edit(null)}>
            <Plus />
            Добавить объект
          </Button>
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogTitle className="text-xl font-semibold">
            {editing ? "Редактировать объект" : "Новый объект"}
          </DialogTitle>
          <DialogDescription className="mb-6 mt-2 text-sm text-slate-500">
            Эти данные используются при формировании договора.
          </DialogDescription>
          <form onSubmit={save} className="space-y-4">
            {[
              { name: "name", label: "Название объекта", max: 120 },
              { name: "address", label: "Адрес", max: 300 },
            ].map((field) => (
              <label key={field.name} className="block">
                <span className="label">{field.label}</span>
                <input
                  className="field"
                  name={field.name}
                  required
                  maxLength={field.max}
                  defaultValue={
                    editing?.[field.name as "name" | "address"] || ""
                  }
                />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="label">Тип объекта</span>
                <select
                  className="field"
                  name="type"
                  defaultValue={editing?.type || "APARTMENT"}
                >
                  {Object.entries(propertyTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Номер помещения</span>
                <input
                  className="field"
                  name="unit"
                  maxLength={40}
                  defaultValue={editing?.unit || ""}
                />
              </label>
            </div>
            <label className="block">
              <span className="label">Описание</span>
              <textarea
                className="field min-h-24"
                name="description"
                maxLength={2000}
                defaultValue={editing?.description || ""}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="label">Стоимость аренды, ₸</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  max={100000000}
                  step={1}
                  required
                  name="rent"
                  defaultValue={editing?.rent ?? 0}
                />
              </label>
              <label>
                <span className="label">Депозит, ₸</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  max={100000000}
                  step={1}
                  required
                  name="deposit"
                  defaultValue={editing?.deposit ?? 0}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <Button disabled={busy} className="w-full">
              {busy ? "Сохраняем…" : "Сохранить объект"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
