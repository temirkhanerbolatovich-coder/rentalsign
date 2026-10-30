"use client";

import {
  LocaleDate,
  T,
  Localized,
  translate,
  useLanguage,
} from "@/components/language";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Download, LockKeyhole, Check } from "lucide-react";
import { Button } from "./ui/button";
import { ConfirmAction } from "./confirm-action";
import { DemoNotice } from "./demo-notice";
import { ContractDocument } from "./contract-document";
import { clientApi } from "./client-api";
import { Brand } from "./brand";
import type { ContractSnapshot } from "@/validation/schemas";
export function SigningClient({
  token,
  snapshot,
  signedAt,
  expiresAt,
}: {
  token: string;
  snapshot: ContractSnapshot;
  signedAt: string | null;
  expiresAt: string;
}) {
  const language = useLanguage();
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  async function sign() {
    await clientApi(`/api/sign/${token}`, "POST", { acknowledged });
    router.refresh();
  }
  return (
    <main className="min-h-dvh bg-[#f5f6f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2 font-semibold">
            <Brand />
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <LockKeyhole size={13} /> <T text="Персональная ссылка" />{" "}
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="eyebrow">
          {" "}
          <T text="ВАШ ДОГОВОР АРЕНДЫ" />{" "}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          <Localized>
            {signedAt ? "Демонстрация завершена" : "Ознакомьтесь с договором"}
          </Localized>
        </h1>
        <p className="mb-6 mt-3 text-sm leading-6 text-slate-500">
          <Localized>
            {signedAt
              ? "Демонстрационное действие зафиксировано. Итоговый документ доступен для скачивания."
              : "Прочитайте условия и подтвердите ознакомление. Регистрация не требуется."}
          </Localized>
        </p>
        <DemoNotice />
        {signedAt && (
          <div
            role="status"
            className="my-6 flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-5 text-teal-800"
          >
            <CheckCheck size={24} className="shrink-0" />
            <div>
              <strong>
                {" "}
                <T text="ДЕМО — НЕ ПОДПИСАНО ЭЦП" />{" "}
              </strong>
              <p className="mt-2 text-sm">
                {" "}
                <T text="Дата действия:" /> <LocaleDate value={signedAt} />{" "}
                <T text=". Изменение документа заблокировано." />{" "}
              </p>
            </div>
          </div>
        )}
        <div className="my-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {" "}
            <T text="Ссылка действует до" /> <LocaleDate value={expiresAt} />
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/sign/${token}/pdf`}>
              <Download />
              <Localized>
                {signedAt
                  ? "Скачать итоговый демо PDF"
                  : "Скачать предварительный PDF"}
              </Localized>
            </a>
          </Button>
        </div>
        <ContractDocument snapshot={snapshot} signedAt={signedAt} />
        {!signedAt && (
          <section className="card mt-6 p-5 sm:p-7">
            <h2 className="text-lg font-semibold">
              {" "}
              <T text="Подтверждение ознакомления" />{" "}
            </h2>
            <p className="mb-5 mt-2 text-sm leading-6 text-slate-500">
              {" "}
              <T text="Это демонстрация процесса. Действие не создаёт подпись ЭЦП." />{" "}
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-teal-700"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span className="text-sm leading-6">
                {" "}
                <T text="Я прочитал(а) полный текст, ознакомился(лась) с условиями и понимаю, что выполняю демонстрационное действие без настоящей ЭЦП." />{" "}
              </span>
            </label>
            <div className="mt-5">
              <ConfirmAction
                title={translate(
                  "Выполнить демонстрационное действие?",
                  language,
                )}
                description="Сервер зафиксирует время ознакомления, а эта версия документа станет неизменяемой. Настоящая ЭЦП не используется."
                label="Демонстрационное подписание"
                trigger={
                  <>
                    <Check /> <T text="Демонстрационное подписание" />{" "}
                  </>
                }
                disabled={!acknowledged}
                onConfirm={sign}
              />
            </div>
          </section>
        )}
        <footer className="py-8 text-center text-[11px] leading-5 text-slate-400">
          {" "}
          <T text="RentalSign · Демонстрационный MVP" /> <br />{" "}
          <T text="Не вводите ключи ЭЦП или пароли от них. Сервис их не запрашивает." />{" "}
        </footer>
      </div>
    </main>
  );
}
