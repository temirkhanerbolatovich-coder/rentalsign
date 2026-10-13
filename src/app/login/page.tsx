import { redirect } from "next/navigation";
import { getAdmin } from "@/auth/session";
import { LoginForm } from "./login-form";
export default async function Login() {
  if (await getAdmin()) redirect("/dashboard");
  return <LoginForm />;
}
