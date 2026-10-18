"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Plus, Save } from "lucide-react";
import { Button } from "./ui/button";
import { PageTitle } from "./page-title";
import { DemoNotice } from "./demo-notice";
import { clientApi } from "./client-api";
import { termLabels } from "@/domain/contracts";
import type { ContractTemplate } from "@/domain/contract-template";
import { contractTemplateSchema } from "@/validation/contract-template";

export function ContractTemplateEditor({
  initial,
}: {
  initial: ContractTemplate;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof ContractTemplate, value: string) {
    setData((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = contractTemplateSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      setData(
        await clientApi<ContractTemplate>(
          "/api/contract-template",
          "PUT",
          parsed.data,
        ),
      );
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function field(
    key: keyof ContractTemplate,
    label: string,
    max: number,
    type = "text",
  ) {
    return (
      <label className="block">
        <span className="label">{label}</span>
        <input
          className="field"
          value={data[key]}
          onChange={(event) => update(key, event.target.value)}
          maxLength={max}
          type={type}
          autoComplete="off"
        />
      </label>
    );
  }

  return (
    <>
      <PageTitle
        title="Шаблон договора"
        description="Один раз заполните реквизиты и условия. Они подставятся в каждый новый договор."
      >
        <Button asChild variant="outline">
          <Link href="/contracts/new">
            <Plus />
            Создать договор
          </Link>
        </Button>
      </PageTitle>
      <div className="mb-6">
        <DemoNotice compact />
      </div>
      <form
        onSubmit={save}
        onInvalidCapture={(event) => {
          const section = (event.target as HTMLElement).closest("details");
          if (section) section.open = true;
        }}
      >
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_290px]">
          <div className="space-y-5">
            <section className="card p-5 sm:p-7">
              <h2 className="text-base font-semibold">
                Реквизиты арендодателя
              </h2>
              <p className="mb-5 mt-2 text-xs leading-5 text-slate-500">
                Данные доступны в вашем кабинете и попадут в договор при его
                создании. Можно оставить поля пустыми и заполнить их позже.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  {field("landlordName", "ФИО или название организации", 200)}
                </div>
                {field("landlordPhone", "Контактный телефон", 24, "tel")}
                {field("landlordId", "ИИН / БИН", 12)}
                {field("landlordDocument", "Удостоверение личности, №", 200)}
                {field("landlordDocumentIssued", "Кем и когда выдано", 300)}
              </div>
            </section>
            <section className="card p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <FileText size={18} className="text-teal-700" />
                Условия по вашему образцу
              </h2>
              <p className="mb-5 mt-2 text-xs leading-5 text-slate-500">
                Правила проживания подготовлены по присланному договору.
                Проверьте и отредактируйте формулировки перед использованием.
              </p>
              <div className="space-y-3">
                {Object.entries(termLabels).map(([key, label], index) => (
                  <details
                    key={key}
                    open={index === 0}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <summary className="cursor-pointer text-sm font-medium">
                      {label}
                    </summary>
                    <label className="mt-4 block">
                      <span className="sr-only">{label}</span>
                      <textarea
                        className="field min-h-44"
                        value={data[key as keyof typeof termLabels]}
                        onChange={(event) =>
                          update(
                            key as keyof typeof termLabels,
                            event.target.value,
                          )
                        }
                        required
                        maxLength={10000}
                      />
                    </label>
                  </details>
                ))}
                <label className="block pt-3">
                  <span className="label">Дополнительные условия</span>
                  <textarea
                    className="field min-h-24"
                    value={data.additionalTerms}
                    onChange={(event) =>
                      update("additionalTerms", event.target.value)
                    }
                    maxLength={10000}
                    placeholder="Необязательно"
                  />
                </label>
              </div>
            </section>
          </div>
          <aside className="card p-6 xl:sticky xl:top-6">
            <p className="eyebrow">ДЛЯ НОВЫХ ДОГОВОРОВ</p>
            <h2 className="mt-3 text-lg font-semibold">Шаблон готов заранее</h2>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              При оформлении останется выбрать квартиру, указать арендатора,
              даты и согласованную сумму за весь срок.
            </p>
            <p className="my-5 flex gap-2 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
              <Check size={15} className="mt-0.5 shrink-0 text-teal-700" />
              Сохранение шаблона не меняет уже созданные и отправленные
              договоры.
            </p>
            <Button className="w-full" disabled={busy}>
              <Save />
              {busy ? "Сохраняем…" : "Сохранить шаблон"}
            </Button>
            {saved && (
              <p role="status" className="mt-4 text-xs leading-5 text-teal-800">
                Шаблон сохранён. Данные подставятся в новые договоры.
              </p>
            )}
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
