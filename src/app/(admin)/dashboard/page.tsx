import { T, Localized } from "@/components/language";
import Link from "next/link";
import Image from "next/image";
import { Plus, ArrowRight } from "lucide-react";
import { requirePageAdmin } from "@/auth/session";
import { listContracts } from "@/repositories/contracts";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/demo-notice";
import { ContractsTable } from "@/components/contracts-table";
import { getContractTemplate } from "@/services/contract-template";
import { findApartment } from "@/catalog/apartments";
export default async function Dashboard() {
  const admin = await requirePageAdmin();
  const [contracts, propertyCount, template, linkedProperties] =
    await Promise.all([
      listContracts(admin.id),
      db.property.count({ where: { ownerId: admin.id, archived: false } }),
      getContractTemplate(admin.id),
      db.property.findMany({
        where: {
          ownerId: admin.id,
          archived: false,
          catalogSlug: { not: null },
        },
        select: { id: true, name: true, address: true, catalogSlug: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
    ]);
  const templateReady = Boolean(
    template.landlordName && template.landlordPhone,
  );
  const count = (status: string) =>
    contracts.filter((c) => c.effectiveStatus === status).length;
  const stats = [
    {
      label: "Всего договоров",
      value: contracts.length,
    },
    {
      label: "Черновики",
      value: count("DRAFT"),
    },
    {
      label: "Ожидают подписания",
      value: count("PENDING"),
    },
    {
      label: "Подписаны в демо",
      value: count("DEMO_SIGNED"),
    },
    {
      label: "Истекшие ссылки",
      value: count("EXPIRED"),
    },
  ];
  return (
    <>
      <PageTitle
        title="Рабочий обзор"
        description="Ваши объекты, договоры и действия арендаторов в одном месте."
      >
        <Button asChild>
          <Link href="/contracts/new">
            <Plus /> <T text="Создать договор" />{" "}
          </Link>
        </Button>
      </PageTitle>
      <div className="mb-7 grid gap-4 lg:grid-cols-2">
        <Link
          href="/properties"
          className="card flex items-center gap-4 p-5 transition-colors hover:border-teal-300"
        >
          <div className="min-w-0">
            <p className="font-medium">
              {" "}
              <T text="Квартиры:" /> {propertyCount}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {" "}
              <T text="Выберите квартиру и нажмите «Создать договор»." />{" "}
            </p>
          </div>
          <ArrowRight size={17} className="ml-auto shrink-0 text-teal-700" />
        </Link>
        <Link
          href="/templates"
          className="card flex items-center gap-4 p-5 transition-colors hover:border-teal-300"
        >
          <div className="min-w-0">
            <p className="font-medium">
              <Localized>
                {templateReady
                  ? "Шаблон договора подготовлен"
                  : "Подготовьте шаблон договора"}
              </Localized>
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              <Localized>
                {templateReady
                  ? "Реквизиты и условия подставляются в новые договоры."
                  : "Сохраните реквизиты арендодателя один раз."}
              </Localized>
            </p>
          </div>
          <ArrowRight size={17} className="ml-auto shrink-0 text-teal-700" />
        </Link>
      </div>
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map(({ label, value }) => (
          <div key={label} className="card p-5">
            <p className="text-xs font-medium leading-5 text-slate-600">
              <Localized>{label}</Localized>
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </div>
        ))}
      </div>
      {linkedProperties.length > 0 && (
        <section
          className="card mb-7 p-5"
          aria-labelledby="dashboard-properties-title"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow">
                {" "}
                <T text="ОБЪЕКТЫ" />{" "}
              </p>
              <h2
                id="dashboard-properties-title"
                className="mt-1 text-lg font-semibold"
              >
                {" "}
                <T text="Квартиры из каталога" />{" "}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {" "}
                <T text="Ваши активные объекты, связанные с публичным каталогом." />{" "}
              </p>
            </div>
            <Link
              href="/properties"
              className="inline-flex min-h-11 items-center text-sm font-medium text-blue-800 hover:underline"
            >
              {" "}
              <T text="Все объекты" />{" "}
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {linkedProperties.map((property) => {
              const apartment = property.catalogSlug
                ? findApartment(property.catalogSlug)
                : null;
              const photo = apartment?.photos[0];
              return (
                <Link
                  href="/properties"
                  key={property.id}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                >
                  {photo ? (
                    <Image
                      src={photo.src}
                      alt=""
                      width={72}
                      height={64}
                      className="h-16 w-[72px] shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="grid h-16 w-[72px] shrink-0 place-items-center rounded-md bg-slate-100 text-xs text-slate-600">
                      {" "}
                      <T text="Нет фото" />{" "}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium text-slate-900">
                      {property.name}
                    </span>
                    <span className="mt-1 block break-words text-xs text-slate-600">
                      {property.address}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <div className="mb-8">
        <DemoNotice compact />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {" "}
            <T text="Последние договоры" />{" "}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {" "}
            <T text="Статусы учитывают срок действия ссылок на сервере" />{" "}
          </p>
        </div>
        <Link
          href="/contracts"
          className="flex items-center gap-1 text-xs font-medium text-teal-700"
        >
          {" "}
          <T text="Все договоры" /> <ArrowRight size={14} />
        </Link>
      </div>
      <ContractsTable
        compact
        rows={contracts.slice(0, 5).map((c) => ({
          id: c.id,
          number: c.number,
          tenant: c.data.tenantName,
          property: c.data.property.name,
          rent: c.data.rent,
          createdAt: c.createdAt.toISOString(),
          status: c.effectiveStatus,
        }))}
      />
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <Link
          href="/properties"
          className="card flex items-center gap-4 p-5 hover:border-teal-300"
        >
          <div>
            <p className="text-sm font-medium">
              {propertyCount} <T text="действующих объектов" />{" "}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {" "}
              <T text="Адрес подставится; итоговую сумму укажите за весь срок" />{" "}
            </p>
          </div>
          <ArrowRight size={17} className="ml-auto text-slate-400" />
        </Link>
        <div className="card flex items-center gap-4 p-5">
          <div>
            <p className="text-sm font-medium">
              {" "}
              <T text="Создать → отправить → проверить" />{" "}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {" "}
              <T text="Клиенту не нужна регистрация. Достаточно персональной ссылки." />{" "}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
