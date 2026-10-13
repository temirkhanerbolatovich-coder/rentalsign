"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Download,
  PenLine,
  LockKeyhole,
  Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { ConfirmAction } from "./confirm-action";
import { DemoNotice } from "./demo-notice";
import { ContractDocument } from "./contract-document";
import { clientApi } from "./client-api";
import { dateTime } from "@/domain/contracts";
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
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  async function sign() {
    await clientApi(`/api/sign/${token}`, "POST", { acknowledged });
    router.refresh();
  }
  return (
    <main className="min-h-dvh bg-[#f3f6f5]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2 font-semibold">
            <PenLine size={20} className="text-teal-700" />
            RentalSign.
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <LockKeyhole size={13} />
            Персональная ссылка
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="eyebrow">ВАШ ДОГОВОР АРЕНДЫ</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          {signedAt ? "Демонстрация завершена" : "Ознакомьтесь с договором"}
        </h1>
        <p className="mb-6 mt-3 text-sm leading-6 text-slate-500">
          {signedAt
            ? "Демонстрационное действие зафиксировано. Итоговый документ доступен для скачивания."
            : "Прочитайте условия и подтвердите ознакомление. Регистрация не требуется."}
        </p>
        <DemoNotice />
        {signedAt && (
          <div
            role="status"
            className="my-6 flex gap-3 rounded-xl border border-teal-200 bg-teal-50 p-5 text-teal-800"
          >
            <CheckCheck size={24} className="shrink-0" />
            <div>
              <strong>ДЕМО — НЕ ПОДПИСАНО ЭЦП</strong>
              <p className="mt-2 text-sm">
                Дата действия: {dateTime(signedAt)}. Изменение документа
                заблокировано.
              </p>
            </div>
          </div>
        )}
        <div className="my-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Ссылка действует до {dateTime(expiresAt)}
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/sign/${token}/pdf`}>
              <Download />
              {signedAt
                ? "Скачать итоговый демо PDF"
                : "Скачать предварительный PDF"}
            </a>
          </Button>
        </div>
        <ContractDocument snapshot={snapshot} signedAt={signedAt} />
        {!signedAt && (
          <section className="card mt-6 p-5 sm:p-7">
            <h2 className="text-lg font-semibold">
              Подтверждение ознакомления
            </h2>
            <p className="mb-5 mt-2 text-sm leading-6 text-slate-500">
              Это демонстрация процесса. Действие не создаёт подпись ЭЦП.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-teal-700"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span className="text-sm leading-6">
                Я прочитал(а) полный текст, ознакомился(лась) с условиями и
                понимаю, что выполняю демонстрационное действие без настоящей
                ЭЦП.
              </span>
            </label>
            <div className="mt-5">
              <ConfirmAction
                title="Выполнить демонстрационное действие?"
                description="Сервер зафиксирует время ознакомления, а эта версия документа станет неизменяемой. Настоящая ЭЦП не используется."
                label="Демонстрационное подписание"
                trigger={
                  <>
                    <Check />
                    Демонстрационное подписание
                  </>
                }
                disabled={!acknowledged}
                onConfirm={sign}
              />
            </div>
          </section>
        )}
        <footer className="py-8 text-center text-[11px] leading-5 text-slate-400">
          RentalSign · Демонстрационный MVP
          <br />
          Не вводите ключи ЭЦП или пароли от них. Сервис их не запрашивает.
        </footer>
      </div>
    </main>
  );
}
