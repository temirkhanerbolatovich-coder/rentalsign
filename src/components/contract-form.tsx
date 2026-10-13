"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Save,
  Building2,
  FileText,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "./ui/button";
import { DemoNotice } from "./demo-notice";
import { PageTitle } from "./page-title";
import { ContractDocument } from "./contract-document";
import { clientApi } from "./client-api";
import { defaultTerms, termLabels, money } from "@/domain/contracts";
import {
  contractSchema,
  type ContractInput,
  type ContractSnapshot,
  type PropertyInput,
} from "@/validation/schemas";
type FormProperty = PropertyInput & { id: string };
function localTime(value: string) {
  return new Date(new Date(value).getTime() + 5 * 3600000)
    .toISOString()
    .slice(0, 16);
}
const initial = (): ContractInput => ({
  propertyId: "",
  landlordName: "",
  landlordId: "",
  landlordPhone: "",
  tenantName: "",
  tenantId: "",
  tenantPhone: "",
  checkIn: new Date(Date.now() + 86400000).toISOString(),
  checkOut: new Date(Date.now() + 2 * 86400000).toISOString(),
  rent: 0,
  deposit: 0,
  additionalTerms: "",
  ...defaultTerms,
});
export function ContractForm({
  properties,
  existing,
}: {
  properties: FormProperty[];
  existing?: { id: string; revision: number; snapshot: ContractSnapshot };
}) {
  const router = useRouter();
  const [data, setData] = useState<ContractInput>(
    existing?.snapshot
      ? contractSchema.parse(
          Object.fromEntries(
            Object.entries(existing.snapshot).filter(
              ([key]) => !["number", "createdAt", "property"].includes(key),
            ),
          ),
        )
      : initial(),
  );
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const property = properties.find((p) => p.id === data.propertyId);
  function update(key: keyof ContractInput, value: string | number) {
    setData((previous) => ({ ...previous, [key]: value }));
  }
  function validate() {
    const parsed = contractSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return false;
    }
    if (!property) {
      setError("Выберите объект недвижимости");
      return false;
    }
    setError("");
    return true;
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const result = await clientApi(
        existing ? `/api/contracts/${existing.id}` : "/api/contracts",
        existing ? "PATCH" : "POST",
        existing ? { content: data, revision: existing.revision } : data,
      );
      router.push(`/contracts/${result.id}?saved=1`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function textField(
    key: keyof ContractInput,
    label: string,
    options: { optional?: boolean; max?: number; type?: string } = {},
  ) {
    return (
      <label key={key} className="block">
        <span className="label">
          {label}
          {options.optional && (
            <span className="ml-1 font-normal text-slate-400">
              (необязательно)
            </span>
          )}
        </span>
        <input
          className="field"
          value={data[key]}
          onChange={(e) => update(key, e.target.value)}
          type={options.type || "text"}
          required={!options.optional}
          maxLength={options.max || 200}
          autoComplete="off"
        />
      </label>
    );
  }
  const snapshot: ContractSnapshot | undefined = property
    ? {
        ...data,
        property,
        number: existing?.snapshot.number || "Будет присвоен при сохранении",
        createdAt: existing?.snapshot.createdAt || new Date().toISOString(),
      }
    : undefined;
  return (
    <>
      <Link
        href={existing ? `/contracts/${existing.id}` : "/contracts"}
        className="mb-5 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft size={14} />
        Назад к договорам
      </Link>
      <PageTitle
        title={existing ? "Редактировать черновик" : "Новый договор"}
        description="Заполните данные, проверьте текст и сохраните черновик."
      />
      <div className="mb-6">
        <DemoNotice compact />
      </div>
      {!properties.length && (
        <p className="error mb-5">
          Для создания договора{" "}
          <Link href="/properties" className="underline">
            добавьте действующий объект
          </Link>
          .
        </p>
      )}
      <form onSubmit={save}>
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_290px]">
          <div className="space-y-5">
            {preview && snapshot ? (
              <ContractDocument snapshot={snapshot} />
            ) : (
              <>
                <section className="card p-5 sm:p-7">
                  <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                    <Building2 size={18} className="text-teal-700" />
                    Объект и срок аренды
                  </h2>
                  <label className="mb-5 block">
                    <span className="label">Объект недвижимости</span>
                    <select
                      required
                      className="field"
                      value={data.propertyId}
                      onChange={(e) => {
                        const p = properties.find(
                          (p) => p.id === e.target.value,
                        );
                        setData((previous) => ({
                          ...previous,
                          propertyId: e.target.value,
                          rent: p?.rent || 0,
                          deposit: p?.deposit || 0,
                        }));
                      }}
                    >
                      <option value="">Выберите объект</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {property && (
                    <p className="mb-5 text-xs text-slate-500">
                      {property.address}
                    </p>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    {(["checkIn", "checkOut"] as const).map((key) => (
                      <label key={key}>
                        <span className="label">
                          {key === "checkIn"
                            ? "Дата и время заезда"
                            : "Дата и время выезда"}
                        </span>
                        <input
                          className="field"
                          type="datetime-local"
                          required
                          value={localTime(data[key])}
                          onChange={(e) => {
                            if (e.target.value)
                              update(
                                key,
                                new Date(
                                  e.target.value + ":00+05:00",
                                ).toISOString(),
                              );
                          }}
                        />
                      </label>
                    ))}
                    {(["rent", "deposit"] as const).map((key) => (
                      <label key={key}>
                        <span className="label">
                          {key === "rent"
                            ? "Стоимость аренды, ₸"
                            : "Депозит, ₸"}
                        </span>
                        <input
                          className="field"
                          type="number"
                          min={0}
                          max={100000000}
                          step={1}
                          required
                          value={data[key]}
                          onChange={(e) => update(key, Number(e.target.value))}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400">
                    Время: Казахстан, Asia/Almaty (UTC+5). Стоимость за весь
                    указанный период.
                  </p>
                </section>
                {(["landlord", "tenant"] as const).map((party) => (
                  <section key={party} className="card p-5 sm:p-7">
                    <h2 className="mb-5 text-base font-semibold">
                      {party === "landlord" ? "Арендодатель" : "Арендатор"}
                    </h2>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        {textField(
                          `${party}Name`,
                          party === "landlord"
                            ? "ФИО или название организации"
                            : "ФИО арендатора",
                        )}
                      </div>
                      {textField(`${party}Phone`, "Контактный телефон", {
                        max: 24,
                        type: "tel",
                      })}
                      {textField(
                        `${party}Id`,
                        party === "landlord" ? "ИИН / БИН" : "ИИН",
                        { optional: true, max: 12 },
                      )}
                    </div>
                  </section>
                ))}
                <section className="card p-5 sm:p-7">
                  <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                    <FileText size={18} className="text-teal-700" />
                    Условия договора
                  </h2>
                  <p className="mb-5 text-xs leading-5 text-slate-500">
                    Демонстрационный шаблон. Отредактируйте условия под свой
                    сценарий; перед реальным применением нужна юридическая
                    проверка.
                  </p>
                  <div className="space-y-5">
                    {Object.entries(termLabels).map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="label">{label}</span>
                        <textarea
                          className="field min-h-28"
                          value={data[key as keyof typeof termLabels]}
                          onChange={(e) =>
                            update(
                              key as keyof typeof termLabels,
                              e.target.value,
                            )
                          }
                          required
                          maxLength={10000}
                        />
                      </label>
                    ))}
                    <label className="block">
                      <span className="label">Дополнительные условия</span>
                      <textarea
                        className="field min-h-24"
                        value={data.additionalTerms}
                        onChange={(e) =>
                          update("additionalTerms", e.target.value)
                        }
                        maxLength={10000}
                        placeholder="Например, правила проживания и возврата ключей"
                      />
                    </label>
                  </div>
                </section>
              </>
            )}
          </div>
          <aside className="card p-6 xl:sticky xl:top-6">
            <p className="eyebrow">ВАШ ДОГОВОР</p>
            <h2 className="mt-3 text-lg font-semibold">Готовим к отправке</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Сначала сохраните черновик. Персональную ссылку можно создать
              после проверки.
            </p>
            <div className="my-6 space-y-3 border-y border-slate-100 py-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Аренда</span>
                <span className="font-medium">{money(data.rent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Депозит</span>
                <span className="font-medium">{money(data.deposit)}</span>
              </div>
            </div>
            <p className="mb-5 flex gap-2 text-xs leading-5 text-slate-500">
              <Check size={15} className="mt-0.5 shrink-0 text-teal-700" />
              После отправки текст фиксируется и больше не редактируется.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mb-3 w-full"
              onClick={() => {
                if (preview) setPreview(false);
                else if (validate()) setPreview(true);
              }}
            >
              {preview ? <Pencil /> : <Eye />}
              {preview ? "Вернуться к форме" : "Предварительный просмотр"}
            </Button>
            <Button className="w-full" disabled={busy || !properties.length}>
              <Save />
              {busy ? "Сохраняем…" : "Сохранить черновик"}
            </Button>
            {error && (
              <p role="alert" className="error mt-4">
                {error}
              </p>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}
