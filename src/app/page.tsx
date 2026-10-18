import { redirect } from "next/navigation";
import { getAdmin } from "@/auth/session";
export default async function Home() {
  redirect((await getAdmin()) ? "/dashboard" : "/apartments");
}
