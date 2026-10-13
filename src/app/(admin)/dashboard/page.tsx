import Link from "next/link";
import {
  Plus,
  FileText,
  Clock3,
  CheckCheck,
  FilePenLine,
  Link2Off,
  ArrowRight,
  Building2,
} from "lucide-react";
import { requirePageAdmin } from "@/auth/session";
import { listContracts } from "@/repositories/contracts";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/demo-notice";
import { ContractsTable } from "@/components/contracts-table";
export default async function Dashboard() {
  const admin = await requirePageAdmin();
  const [contracts, propertyCount] = await Promise.all([
    listContracts(admin.id),
    db.property.count({ where: { ownerId: admin.id, archived: false } }),
  ]);
  const count = (status: string) =>
    contracts.filter((c) => c.effectiveStatus === status).length;
  const stats = [
    {
      label: "Всего договоров",
      value: contracts.length,
      icon: FileText,
      style: "bg-slate-100 text-slate-600",
    },
    {
      label: "Черновики",
      value: count("DRAFT"),
      icon: FilePenLine,
      style: "bg-blue-50 text-blue-600",
    },
    {
      label: "Ожидают подписания",
      value: count("PENDING"),
      icon: Clock3,
      style: "bg-amber-50 text-amber-600",
    },
    {
      label: "Подписаны в демо",
      value: count("DEMO_SIGNED"),
      icon: CheckCheck,
      style: "bg-teal-50 text-teal-700",
    },
    {
      label: "Истекшие ссылки",
      value: count("EXPIRED"),
      icon: Link2Off,
      style: "bg-orange-50 text-orange-600",
    },
  ];
  return (
    <>
      <PageTitle
        title="Всё под контролем"
        description="Ваши объекты, договоры и действия арендаторов в одном месте."
      >
        <Button asChild>
          <Link href="/contracts/new">
            <Plus />
            Создать договор
          </Link>
        </Button>
      </PageTitle>
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, style }) => (
          <div key={label} className="card p-5">
            <div
              className={`mb-5 grid size-9 place-items-center rounded-lg ${style}`}
            >
              <Icon size={18} />
            </div>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="mb-8">
        <DemoNotice compact />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Последние договоры</h2>
          <p className="mt-1 text-xs text-slate-500">
            Статусы учитывают срок действия ссылок на сервере
          </p>
        </div>
        <Link
          href="/contracts"
          className="flex items-center gap-1 text-xs font-medium text-teal-700"
        >
          Все договоры <ArrowRight size={14} />
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
          <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <Building2 size={22} />
          </span>
          <div>
            <p className="text-sm font-medium">
              {propertyCount} действующих объектов
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Адреса и цены автоматически попадут в договор
            </p>
          </div>
          <ArrowRight size={17} className="ml-auto text-slate-400" />
        </Link>
        <div className="card flex items-center gap-4 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
            <FileText size={22} />
          </span>
          <div>
            <p className="text-sm font-medium">
              Создать → отправить → проверить
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Клиенту не нужна регистрация. Достаточно персональной ссылки.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
