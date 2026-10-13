import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { requirePageAdmin } from "@/auth/session";
import { ownedContract } from "@/repositories/contracts";
import { getOwnedLink } from "@/services/contracts";
import { effectiveStatus, dateTime } from "@/domain/contracts";
import { eventLabels } from "@/audit/events";
import { AppError } from "@/lib/errors";
import { linkTtlHours } from "@/lib/config";
import { ContractDocument } from "@/components/contract-document";
import { ContractActions } from "@/components/contract-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageTitle } from "@/components/page-title";
import { DemoNotice } from "@/components/demo-notice";
import type { ContractSnapshot } from "@/validation/schemas";
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requirePageAdmin();
  const { id } = await params;
  let contract;
  try {
    contract = await ownedContract(admin.id, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const version = contract.versions[0];
  const status = effectiveStatus(contract, version?.link);
  const snapshot = JSON.parse(
    version?.snapshot || contract.content,
  ) as ContractSnapshot;
  const link =
    status === "PENDING" ? await getOwnedLink(admin.id, id) : undefined;
  return (
    <>
      <Link
        href="/contracts"
        className="mb-5 inline-flex items-center gap-2 text-xs text-slate-500"
      >
        <ArrowLeft size={14} />
        Все договоры
      </Link>
      <PageTitle
        title={`Договор ${contract.number}`}
        description={snapshot.tenantName}
      >
        <StatusBadge status={status} />
      </PageTitle>
      {(await searchParams).saved && (
        <p role="status" className="success mb-5">
          Черновик сохранён. Проверьте текст перед созданием ссылки.
        </p>
      )}
      <div className="mb-6">
        <DemoNotice compact />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_310px]">
        <div>
          <ContractDocument snapshot={snapshot} signedAt={version?.signedAt} />
          {contract.versions.length > 1 && (
            <section className="card mt-6 p-6">
              <h2 className="mb-4 text-sm font-semibold">
                Отправленные версии
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                Каждая версия хранит неизменяемый текст и хеш содержания.
              </p>
              {contract.versions.map((v) => (
                <p
                  key={v.id}
                  className="border-t border-slate-100 py-3 text-xs text-slate-500"
                >
                  Версия {v.version} · {dateTime(v.createdAt)} ·{" "}
                  {v.signedAt
                    ? "Демо выполнено"
                    : v.link?.revokedAt
                      ? "Ссылка отозвана"
                      : "Отправлена"}
                </p>
              ))}
            </section>
          )}
        </div>
        <aside className="space-y-5">
          <ContractActions
            id={id}
            number={contract.number}
            revision={contract.revision}
            status={status}
            phone={snapshot.tenantPhone}
            initialLink={
              link
                ? { url: link.url, expiresAt: link.expiresAt.toISOString() }
                : undefined
            }
            defaultTtl={linkTtlHours()}
          />
          <section className="card p-5">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold">
              <History size={17} className="text-slate-400" />
              Журнал событий
            </h2>
            <ol className="space-y-5">
              {contract.events.map((event) => (
                <li
                  key={event.id}
                  className="relative border-l-2 border-teal-100 pl-4"
                >
                  <p className="text-xs font-medium">
                    {eventLabels[event.action] || event.action}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {dateTime(event.createdAt)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {event.actor === "ADMIN" ? "Администратор" : "Клиент"}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
