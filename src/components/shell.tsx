"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Building2,
  LogOut,
  PenLine,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { clientApi } from "./client-api";
const navigation = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/contracts", label: "Договоры", icon: FileText },
  { href: "/properties", label: "Объекты", icon: Building2 },
];
export function Shell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[#142d36] text-white md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-7 py-8">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-400/15 text-teal-300">
            <PenLine size={21} />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            RentalSign<span className="text-teal-300">.</span>
          </span>
        </Link>
        <div className="px-7 pb-4 pt-3 text-[10px] font-semibold tracking-[0.18em] text-slate-400">
          РАБОЧЕЕ ПРОСТРАНСТВО
        </div>
        <nav className="space-y-1 px-4">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${active(href) ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
            >
              <Icon size={18} className={active(href) ? "text-teal-300" : ""} />
              {label}
              {active(href) && (
                <span className="ml-auto size-1.5 rounded-full bg-teal-300" />
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-5">
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <ShieldCheck className="mb-3 text-teal-300" size={20} />
            <p className="text-sm font-medium">Без лишней бумаги</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Договор, ссылка и демоподписание — в одном месте.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-[11px] text-teal-300">
              Локальный MVP <ArrowUpRight size={12} />
            </span>
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 pt-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-400/20 text-sm text-teal-200">
              А
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium">Администратор</p>
              <p className="max-w-32 truncate text-[10px] text-slate-400">
                {email}
              </p>
            </div>
            <button
              onClick={logout}
              disabled={busy}
              className="ml-auto text-slate-400 hover:text-white disabled:opacity-50"
              aria-label="Выйти"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="md:ml-60">
        <header className="flex h-17 items-center justify-between border-b border-slate-200/70 bg-white px-5 lg:px-10">
          <div className="hidden text-sm text-slate-500 md:block">
            Рабочее пространство <span className="mx-3 text-slate-300">/</span>
            <span className="text-slate-800">
              {navigation.find((item) => active(item.href))?.label || "Договор"}
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold md:hidden"
          >
            <PenLine className="text-teal-700" size={20} />
            RentalSign.
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-[11px] font-medium text-teal-700">
              MVP · Демо
            </span>
            <button
              className="md:hidden"
              onClick={logout}
              disabled={busy}
              aria-label="Выйти"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="error mx-5 mt-4">
            {error}
          </p>
        )}
        <main className="mx-auto max-w-[1440px] p-5 pb-28 lg:p-10 md:pb-10">
          {children}
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-white/95 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-w-20 flex-col items-center gap-1 rounded-lg px-4 py-2 text-[11px] ${active(href) ? "bg-teal-50 text-teal-800" : "text-slate-500"}`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
