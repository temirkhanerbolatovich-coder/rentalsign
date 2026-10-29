"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { clientApi } from "./client-api";
import { Brand } from "./brand";

const navigation = [
  { href: "/dashboard", label: "Обзор" },
  { href: "/contracts", label: "Договоры" },
  { href: "/properties", label: "Объекты" },
  { href: "/templates", label: "Шаблон" },
  { href: "/apartments", label: "Каталог" },
];

export function Shell({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = (href: string) => pathname.startsWith(href);
  async function logout() {
    setBusy(true);
    try {
      await clientApi("/api/auth/logout", "POST");
      router.push("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/dashboard" className="flex items-center px-6 py-7 text-xl"><Brand /></Link>
        <p className="px-6 pb-3 text-[10px] font-semibold tracking-[0.16em] text-slate-500">РАБОЧЕЕ ПРОСТРАНСТВО</p>
        <nav aria-label="Разделы кабинета" className="space-y-1 px-3">
          {navigation.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-4 text-sm ${active(href) ? "bg-amber-100 font-semibold text-amber-950" : "text-slate-700 hover:bg-slate-50"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-800">Администратор</p>
          <p className="mt-1 break-all text-xs text-slate-500">{email}</p>
          <button onClick={logout} disabled={busy} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 hover:text-blue-800 disabled:opacity-50" aria-label="Выйти">
            <LogOut size={17} aria-hidden="true" /> Выйти
          </button>
        </div>
      </aside>
      <div className="md:ml-60">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-10">
          <div className="hidden text-sm text-slate-500 md:block">Рабочее пространство <span className="mx-3 text-slate-300">/</span><span className="text-slate-800">{navigation.find((item) => active(item.href))?.label || "Договор"}</span></div>
          <Link href="/dashboard" className="flex items-center font-semibold md:hidden"><Brand /></Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-950">MVP · Демо</span>
            <button className="inline-flex min-h-11 min-w-11 items-center justify-center md:hidden" onClick={logout} disabled={busy} aria-label="Выйти"><LogOut size={18} aria-hidden="true" /></button>
          </div>
        </header>
        {error && <p role="alert" className="error mx-5 mt-4">{error}</p>}
        <main className="mx-auto max-w-[1440px] p-4 pb-28 sm:p-5 lg:p-10 md:pb-10">{children}</main>
        <nav aria-label="Разделы кабинета" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white px-1 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
          {navigation.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-1 text-center text-[11px] ${active(href) ? "bg-amber-100 font-semibold text-amber-950" : "text-slate-600"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
