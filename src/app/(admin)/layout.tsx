import { requirePageAdmin } from "@/auth/session";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePageAdmin();
  return <Shell email={admin.email}>{children}</Shell>;
}
