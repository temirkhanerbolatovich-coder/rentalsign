"use client";

import {
  LocaleDate,
  T,
  Localized,
  translate,
  useLanguage,
} from "@/components/language";

import Link from "next/link";
import { useState } from "react";
import { Search, ArrowUpRight, Copy, Download, FileText } from "lucide-react";
import {
  money,
  statuses,
  statusLabels,
  type ContractStatus,
} from "@/domain/contracts";
import { StatusBadge } from "./ui/status-badge";
import { Button } from "./ui/button";
import { clientApi } from "./client-api";
export type ContractRow = {
  id: string;
  number: string;
  tenant: string;
  property: string;
  rent: number;
  createdAt: string;
  status: ContractStatus;
};
export function ContractsTable({
  rows,
  compact = false,
}: {
  rows: ContractRow[];
  compact?: boolean;
}) {
  const language = useLanguage();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const filtered = rows.filter(
    (row) =>
      (!status || row.status === status) &&
      `${row.number} ${row.tenant} ${row.property}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function copy(id: string) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const link = await clientApi<{ url: string }>(
        `/api/contracts/${id}/link`,
      );
      await navigator.clipboard.writeText(link.url);
      setMessage("Персональная ссылка скопирована");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="card overflow-hidden">
      {!compact && (
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="relative min-w-48 flex-1">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={16}
            />
            <input
              aria-label={translate("Поиск договоров", language)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={translate("Номер, арендатор или объект…", language)}
              className="field pl-10"
            />
          </div>
          <select
            aria-label={translate("Фильтр по статусу", language)}
            className="field w-full sm:w-52"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">
              {" "}
              <T text="Все статусы" />{" "}
            </option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                <Localized>{statusLabels[value]}</Localized>
              </option>
            ))}
          </select>
        </div>
      )}
      {message && (
        <p role="status" className="success m-4">
          <Localized>{message}</Localized>
        </p>
      )}
      {error && (
        <p role="alert" className="error m-4">
          <Localized>{error}</Localized>
        </p>
      )}
      <div>
        <table className="w-full text-left text-sm">
          <thead className="hidden lg:table-header-group">
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-medium">
                {" "}
                <T text="Договор / арендатор" />{" "}
              </th>
              <th className="px-5 py-3 font-medium">
                {" "}
                <T text="Объект" />{" "}
              </th>
              <th className="hidden px-5 py-3 font-medium lg:table-cell">
                {" "}
                <T text="Создан" />{" "}
              </th>
              <th className="px-5 py-3 font-medium">
                {" "}
                <T text="Стоимость" />{" "}
              </th>
              <th className="px-5 py-3 font-medium">
                {" "}
                <T text="Статус" />{" "}
              </th>
              <th className="relative px-5 py-3 font-medium">
                <span className="sr-only">
                  {" "}
                  <T text="Действия" />{" "}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="block border-b border-slate-100 px-4 py-4 last:border-b-0 hover:bg-slate-50/60 lg:table-row lg:p-0"
              >
                <td className="block py-1 lg:table-cell lg:px-5 lg:py-5">
                  <Link
                    href={`/contracts/${row.id}`}
                    className="font-medium text-slate-900 hover:text-teal-700"
                  >
                    {row.tenant}
                  </Link>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {row.number}
                  </p>
                </td>
                <td className="block break-words py-1 text-slate-600 lg:table-cell lg:max-w-52 lg:px-5 lg:py-5">
                  <span className="font-medium lg:hidden">
                    {" "}
                    <T text="Объект:" />{" "}
                  </span>
                  {row.property}
                </td>
                <td className="block py-1 text-xs text-slate-600 lg:table-cell lg:px-5 lg:py-5">
                  <span className="font-medium lg:hidden">
                    {" "}
                    <T text="Создан:" />{" "}
                  </span>
                  <LocaleDate value={row.createdAt} />
                </td>
                <td className="block py-1 font-medium lg:table-cell lg:px-5 lg:py-5">
                  <span className="lg:hidden">
                    {" "}
                    <T text="Стоимость:" />{" "}
                  </span>
                  {money(row.rent)}
                </td>
                <td className="block py-1 lg:table-cell lg:px-5 lg:py-5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="block py-1 lg:table-cell lg:px-3 lg:py-4">
                  <div className="flex justify-start gap-1 lg:justify-end">
                    {!compact && row.status === "PENDING" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${translate("Копировать ссылку", language)} ${row.number}`}
                        onClick={() => copy(row.id)}
                        disabled={busy === row.id}
                      >
                        <Copy />
                      </Button>
                    )}
                    {!compact && (
                      <Button asChild variant="ghost" size="icon">
                        <a
                          href={`/api/contracts/${row.id}/pdf`}
                          aria-label={`${translate("Скачать PDF", language)} ${row.number}`}
                        >
                          <Download />
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={`/contracts/${row.id}`}
                        aria-label={`${translate("Открыть", language)} ${row.number}`}
                      >
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="py-16 text-center">
          <FileText className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="font-medium">
            <Localized>
              {rows.length ? "Договоры не найдены" : "Пока нет договоров"}
            </Localized>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            <Localized>
              {rows.length
                ? "Измените поисковый запрос или фильтр."
                : "Создайте первый договор, чтобы начать работу."}
            </Localized>
          </p>
        </div>
      )}
      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        <Localized>
          {compact
            ? "Последние созданные договоры"
            : `Показано ${filtered.length} из ${rows.length} договоров`}
        </Localized>
      </div>
    </div>
  );
}
