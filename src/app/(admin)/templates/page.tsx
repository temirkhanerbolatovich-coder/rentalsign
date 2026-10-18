import { requirePageAdmin } from "@/auth/session";
import { ContractTemplateEditor } from "@/components/contract-template-editor";
import { getContractTemplate } from "@/services/contract-template";

export default async function TemplatesPage() {
  const admin = await requirePageAdmin();
  return (
    <ContractTemplateEditor initial={await getContractTemplate(admin.id)} />
  );
}
