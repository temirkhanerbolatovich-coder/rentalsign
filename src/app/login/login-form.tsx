"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/demo-notice";
import { clientApi } from "@/components/client-api";
import { Brand } from "@/components/brand";
export function LoginForm({
  destination = "/dashboard",
  apartmentTitle,
}: {
  destination?: string;
  apartmentTitle?: string;
}) {
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
      router.push(destination);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200 bg-white p-14 text-slate-900 lg:flex">
        <div className="flex items-center gap-3 text-2xl font-semibold">
          <Brand />
        </div>
        <div className="relative max-w-xl">
          <p className="mb-6 text-xs tracking-[0.18em] text-amber-800">
            АРЕНДА НАЧИНАЕТСЯ С ДОГОВОРА
          </p>
          <h1 className="text-5xl font-semibold leading-[1.15] tracking-tight">
            Меньше бумаги.
            <br />
            <span className="text-blue-800">Больше порядка.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-slate-600">
            Оформляйте договоры аренды, отправляйте персональные ссылки и
            следите за каждым этапом.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              "Создайте договор",
              "Отправьте ссылку",
              "Получите результат",
            ].map((label, i) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="mb-3 text-xs font-semibold text-amber-800">0{i + 1}</p>
                <p className="text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Демонстрационный MVP · Сделано для понятной аренды
        </p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center gap-2 text-xl font-semibold lg:hidden">
            <Brand />
          </div>
          <div className="mb-6 grid size-12 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
            <LockKeyhole size={23} />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Добро пожаловать
          </h2>
          <p className="mb-8 mt-3 text-sm text-slate-500">
            Войдите в пространство управления арендой.
          </p>
          {apartmentTitle && (
            <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
              Вход для владельца: подготовка договора на {apartmentTitle}.
              Арендатор получает персональную ссылку от владельца без
              регистрации.
            </p>
          )}
          <Link
            href="/apartments"
            className="mb-6 inline-block text-sm text-blue-800 underline underline-offset-4"
          >
            Вернуться в каталог квартир
          </Link>
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
