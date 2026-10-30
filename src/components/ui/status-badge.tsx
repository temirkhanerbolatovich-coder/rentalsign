import { Localized } from "@/components/language";
import { statusLabels, type ContractStatus } from "@/domain/contracts";
const colors: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING: "bg-amber-50 text-amber-700",
  DEMO_SIGNED: "bg-teal-50 text-teal-700",
  EXPIRED: "bg-orange-50 text-orange-700",
  REVOKED: "bg-rose-50 text-rose-700",
};
export function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${colors[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      <Localized>{statusLabels[status]}</Localized>
    </span>
  );
}
