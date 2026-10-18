"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, ArrowUpRight, Copy, Download, FileText } from "lucide-react";
import {
  dateTime,
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
              aria-label="Поиск договоров"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Номер, арендатор или объект…"
              className="field pl-10"
            />
          </div>
          <select
            aria-label="Фильтр по статусу"
            className="field w-full sm:w-52"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Все статусы</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </div>
      )}
      {message && (
        <p role="status" className="success m-4">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error m-4">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-medium">Договор / арендатор</th>
              <th className="hidden px-5 py-3 font-medium lg:table-cell">
                Объект
              </th>
              <th className="hidden px-5 py-3 font-medium xl:table-cell">
                Создан
              </th>
              <th className="px-5 py-3 font-medium">Стоимость</th>
              <th className="px-5 py-3 font-medium">Статус</th>
              <th className="relative px-5 py-3 font-medium">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
              >
                <td className="px-5 py-5">
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
                <td className="hidden max-w-52 px-5 py-5 text-slate-500 lg:table-cell">
                  {row.property}
                </td>
                <td className="hidden px-5 py-5 text-xs text-slate-500 xl:table-cell">
                  {dateTime(row.createdAt)}
                </td>
                <td className="whitespace-nowrap px-5 py-5 font-medium">
                  {money(row.rent)}
                </td>
                <td className="px-5 py-5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-4">
                  <div className="flex justify-end gap-1">
                    {!compact && row.status === "PENDING" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Копировать ссылку ${row.number}`}
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
                          aria-label={`Скачать PDF ${row.number}`}
                        >
                          <Download />
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={`/contracts/${row.id}`}
                        aria-label={`Открыть ${row.number}`}
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
            {rows.length ? "Договоры не найдены" : "Пока нет договоров"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {rows.length
              ? "Измените поисковый запрос или фильтр."
              : "Создайте первый договор, чтобы начать работу."}
          </p>
        </div>
      )}
      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        {compact
          ? "Последние созданные договоры"
          : `Показано ${filtered.length} из ${rows.length} договоров`}
      </div>
    </div>
  );
}
