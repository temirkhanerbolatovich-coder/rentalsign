import { T } from "@/components/language";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePageAdmin } from "@/auth/session";
import { listContracts } from "@/repositories/contracts";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { ContractsTable } from "@/components/contracts-table";
export default async function Contracts() {
  const contracts = await listContracts((await requirePageAdmin()).id);
  return (
    <>
      <PageTitle
        title="Договоры"
        description="Создавайте договоры, отправляйте ссылки и отслеживайте результат."
      >
        <Button asChild>
          <Link href="/contracts/new">
            <Plus /> <T text="Создать договор" />{" "}
          </Link>
        </Button>
      </PageTitle>
      <ContractsTable
        rows={contracts.map((c) => ({
          id: c.id,
          number: c.number,
          tenant: c.data.tenantName,
          property: c.data.property.name,
          rent: c.data.rent,
          createdAt: c.createdAt.toISOString(),
          status: c.effectiveStatus,
        }))}
      />
    </>
  );
}
