"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  PenLine,
  Check,
  LockKeyhole,
  FileText,
  Send,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/demo-notice";
import { clientApi } from "@/components/client-api";
export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await clientApi("/api/auth/login", "POST", {
        email: form.get("email"),
        password: form.get("password"),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#142d36] p-14 text-white lg:flex">
        <div className="flex items-center gap-3 text-2xl font-semibold">
          <span className="rounded-xl bg-teal-400/15 p-2 text-teal-300">
            <PenLine size={24} />
          </span>
          RentalSign<span className="-ml-3 text-teal-300">.</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-6 text-xs tracking-[0.18em] text-teal-300">
            АРЕНДА НАЧИНАЕТСЯ С ДОГОВОРА
          </p>
          <h1 className="text-5xl font-semibold leading-[1.15] tracking-tight">
            Меньше бумаги.
            <br />
            <span className="text-teal-200">Больше порядка.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-slate-300">
            Оформляйте договоры аренды, отправляйте персональные ссылки и
            следите за каждым этапом.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { icon: FileText, label: "Создайте договор" },
              { icon: Send, label: "Отправьте ссылку" },
              { icon: CheckCheck, label: "Получите результат" },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <Icon className="mb-5 text-teal-300" size={23} />
                <p className="mb-1 text-[10px] text-slate-400">0{i + 1}</p>
                <p className="text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Демонстрационный MVP · Сделано для понятной аренды
        </p>
        <div className="pointer-events-none absolute -right-40 -top-40 size-[550px] rounded-full border border-white/5" />
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center gap-2 text-xl font-semibold lg:hidden">
            <PenLine className="text-teal-700" />
            RentalSign.
          </div>
          <div className="mb-6 grid size-12 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700">
            <LockKeyhole size={23} />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Добро пожаловать
          </h2>
          <p className="mb-8 mt-3 text-sm text-slate-500">
            Войдите в пространство управления арендой.
          </p>
          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="label">Email администратора</span>
              <input
                className="field h-12"
                name="email"
                type="email"
                placeholder="you@example.kz"
                required
                autoComplete="username"
                maxLength={254}
              />
            </label>
            <label className="block">
              <span className="label">Пароль</span>
              <input
                className="field h-12"
                name="password"
                type="password"
                placeholder="Введите пароль"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <Button disabled={busy} className="h-12 w-full">
              {busy ? "Входим…" : "Войти в аккаунт"}
              <ArrowRight />
            </Button>
          </form>
          <p className="mb-8 mt-5 flex items-center gap-2 text-xs text-slate-500">
            <Check size={14} className="text-teal-700" />
            Защищённая сессия администратора
          </p>
          <DemoNotice compact />
          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Аккаунт создаётся владельцем сервиса через CLI.
            <br />
            Публичных тестовых паролей нет.
          </p>
        </div>
      </section>
    </main>
  );
}
