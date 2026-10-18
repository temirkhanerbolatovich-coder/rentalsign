import { dateTime, money, termLabels } from "@/domain/contracts";
import type { ContractSnapshot } from "@/validation/schemas";
export function ContractDocument({
  snapshot,
  signedAt,
}: {
  snapshot: ContractSnapshot;
  signedAt?: string | Date | null;
}) {
  return (
    <article className="document overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-9">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <p className="eyebrow">ДЕМОНСТРАЦИОННЫЙ ШАБЛОН</p>
        <h2 className="mt-3 text-xl font-semibold">Договор аренды помещения</h2>
        <p className="mt-2 text-sm text-slate-500">
          № {snapshot.number} · {dateTime(snapshot.createdAt)}
        </p>
      </div>
      <section>
        <h3>1. Стороны договора</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Арендодатель</p>
            <p className="mt-1 font-medium">{snapshot.landlordName}</p>
            <p>{snapshot.landlordPhone}</p>
            {snapshot.landlordId && <p>ИИН/БИН: {snapshot.landlordId}</p>}
            {snapshot.landlordDocument && (
              <p>Удостоверение личности: {snapshot.landlordDocument}</p>
            )}
            {snapshot.landlordDocumentIssued && (
              <p>Кем и когда выдано: {snapshot.landlordDocumentIssued}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Арендатор</p>
            <p className="mt-1 font-medium">{snapshot.tenantName}</p>
            <p>{snapshot.tenantPhone}</p>
            {snapshot.tenantId && <p>ИИН: {snapshot.tenantId}</p>}
            {snapshot.tenantDocument && (
              <p>Удостоверение личности / паспорт: {snapshot.tenantDocument}</p>
            )}
            {snapshot.tenantAddress && (
              <p>Адрес проживания: {snapshot.tenantAddress}</p>
            )}
          </div>
        </div>
      </section>
      <section>
        <h3>2. Объект и срок аренды</h3>
        <p className="font-medium">{snapshot.property.name}</p>
        <p>
          {snapshot.property.address}
          {snapshot.property.unit
            ? `, помещение ${snapshot.property.unit}`
            : ""}
        </p>
        {snapshot.property.description && (
          <p className="mt-2 text-slate-500">{snapshot.property.description}</p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-slate-500">Заезд</span>
            <p>{dateTime(snapshot.checkIn)}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Выезд</span>
            <p>{dateTime(snapshot.checkOut)}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Аренда за весь срок</span>
            <p className="font-semibold">{money(snapshot.rent)}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Депозит</span>
            <p className="font-semibold">{money(snapshot.deposit)}</p>
          </div>
        </div>
      </section>
      {Object.entries(termLabels).map(([key, label], index) => (
        <section key={key}>
          <h3>
            {index + 3}. {label}
          </h3>
          <p className="whitespace-pre-wrap break-words">
            {snapshot[key as keyof typeof termLabels]}
          </p>
        </section>
      ))}
      {snapshot.additionalTerms && (
        <section>
          <h3>8. Дополнительные условия</h3>
          <p className="whitespace-pre-wrap break-words">
            {snapshot.additionalTerms}
          </p>
        </section>
      )}
      <div
        className={`mt-8 rounded-lg border p-4 text-sm ${signedAt ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}
      >
        <strong>
          {signedAt ? "ДЕМО — НЕ ПОДПИСАНО ЭЦП" : "Предварительный документ"}
        </strong>
        <p className="mt-1">
          {signedAt
            ? `Демонстрационное действие зафиксировано: ${dateTime(signedAt)}.`
            : "Демонстрационное действие ещё не выполнено."}{" "}
          Шаблон не прошёл юридическую проверку.
        </p>
      </div>
    </article>
  );
}
