"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  Link2,
  MessageCircle,
  Ban,
  Files,
  Pencil,
} from "lucide-react";
import { Button } from "./ui/button";
import { ConfirmAction } from "./confirm-action";
import { clientApi } from "./client-api";
import { dateTime, whatsappUrl, type ContractStatus } from "@/domain/contracts";
export function ContractActions({
  id,
  number,
  revision,
  status,
  phone,
  initialLink,
  defaultTtl,
}: {
  id: string;
  number: string;
  revision: number;
  status: ContractStatus;
  phone: string;
  initialLink?: { url: string; expiresAt: string };
  defaultTtl: number;
}) {
  const router = useRouter();
  const [ttl, setTtl] = useState(defaultTtl);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const link = status === "PENDING" ? initialLink : undefined;
  async function issue() {
    await clientApi(`/api/contracts/${id}/link`, "POST", {
      ttlHours: ttl,
      revision,
    });
    setMessage("Ссылка создана. Текст договора зафиксирован");
    router.refresh();
  }
  async function revoke() {
    await clientApi(`/api/contracts/${id}/link`, "DELETE");
    setMessage("Ссылка отозвана");
    router.refresh();
  }
  async function duplicate() {
    setBusy(true);
    setError("");
    try {
      const copy = await clientApi(`/api/contracts/${id}/duplicate`, "POST");
      router.push(`/contracts/${copy.id}/edit`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setMessage("Ссылка скопирована");
      setError("");
    } catch {
      setError(
        "Браузер не разрешил копирование. Выделите и скопируйте ссылку из поля",
      );
    }
  }
  return (
    <div className="card p-5">
      <p className="eyebrow">ДЕЙСТВИЯ С ДОГОВОРОМ</p>
      <div className="mt-5 space-y-3">
        <Button asChild variant="outline" className="w-full">
          <a href={`/api/contracts/${id}/pdf`}>
            <Download />
            {status === "DEMO_SIGNED" ? "Итоговый демо PDF" : "Скачать PDF"}
          </a>
        </Button>
        {status === "DRAFT" && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/contracts/${id}/edit`}>
              <Pencil />
              Редактировать черновик
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={duplicate}
        >
          <Files />
          {busy ? "Создаём копию…" : "Создать на основе"}
        </Button>
      </div>
      {status !== "DEMO_SIGNED" && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          {link && (
            <>
              <label className="block">
                <span className="label">Персональная ссылка</span>
                <input
                  readOnly
                  value={link.url}
                  className="field text-xs"
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Действует до {dateTime(link.expiresAt)}
              </p>
              <Button className="mt-3 w-full" onClick={copy}>
                <Copy />
                Копировать ссылку
              </Button>
              <Button asChild variant="outline" className="mt-3 w-full">
                <a
                  href={whatsappUrl(phone, link.url, number)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle />
                  Отправить в WhatsApp
                </a>
              </Button>
              <div className="mt-3">
                <ConfirmAction
                  title="Отозвать персональную ссылку?"
                  description="Клиент больше не сможет открыть договор по этой ссылке. Снимок договора сохранится."
                  label="Отозвать ссылку"
                  trigger={
                    <>
                      <Ban />
                      Отозвать ссылку
                    </>
                  }
                  destructive
                  onConfirm={revoke}
                />
              </div>
            </>
          )}
          <label className="mt-5 block">
            <span className="label">Срок новой ссылки, часов</span>
            <input
              className="field"
              type="number"
              min={1}
              max={720}
              step={1}
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
            />
          </label>
          <div className="mt-3">
            <ConfirmAction
              title={
                link
                  ? "Заменить действующую ссылку?"
                  : "Создать персональную ссылку?"
              }
              description="Текст договора будет зафиксирован. Если уже есть ссылка, она перестанет действовать. Изменить отправленный договор можно только созданием нового договора на его основе."
              label="Создать ссылку"
              trigger={
                <>
                  <Link2 />
                  {link ? "Создать новую ссылку" : "Сформировать ссылку"}
                </>
              }
              disabled={!Number.isInteger(ttl) || ttl < 1 || ttl > 720}
              onConfirm={issue}
            />
          </div>
        </div>
      )}
      {status === "DEMO_SIGNED" && (
        <p className="mt-5 rounded-lg bg-teal-50 p-4 text-xs leading-5 text-teal-800">
          Демонстрационное действие выполнено. Содержание этой версии
          заблокировано.
        </p>
      )}
      {message && (
        <p role="status" className="success mt-4">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error mt-4">
          {error}
        </p>
      )}
    </div>
  );
}
