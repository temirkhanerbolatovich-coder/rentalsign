"use client";

import { T, Localized, translate, useLanguage } from "@/components/language";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Building2,
  ScrollText,
  House,
  CalendarDays,
} from "lucide-react";
import { LightNavigation } from "./light-navigation";
import { clientApi } from "./client-api";
import { Brand } from "./brand";

const navigation = [
  { href: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Обзор" },
  { href: "/contracts", icon: <FileText size={18} />, label: "Договоры" },
  { href: "/properties", icon: <Building2 size={18} />, label: "Объекты" },
  {
    href: "/availability",
    icon: <CalendarDays size={18} />,
    label: "Занятость",
  },
  { href: "/templates", icon: <ScrollText size={18} />, label: "Шаблон" },
  { href: "/apartments", icon: <House size={18} />, label: "Каталог" },
];

export function Shell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const language = useLanguage();
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
        <Link href="/dashboard" className="flex items-center px-6 py-7 text-xl">
          <Brand />
        </Link>
        <p className="px-6 pb-3 text-[10px] font-semibold tracking-[0.16em] text-slate-500">
          {" "}
          <T text="РАБОЧЕЕ ПРОСТРАНСТВО" />{" "}
        </p>
        <LightNavigation
          items={navigation}
          label="Разделы кабинета"
          vertical
          className="mx-3"
        />
        <div className="mt-auto border-t border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-800">
            {" "}
            <T text="Администратор" />{" "}
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">{email}</p>
          <button
            onClick={logout}
            disabled={busy}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 hover:text-blue-800 disabled:opacity-50"
            aria-label={translate("Выйти", language)}
          >
            <LogOut size={17} aria-hidden="true" /> <T text="Выйти" />{" "}
          </button>
        </div>
      </aside>
      <div className="md:ml-60">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-10">
          <div className="hidden text-sm text-slate-500 md:block">
            {" "}
            <T text="Рабочее пространство" />{" "}
            <span className="mx-3 text-slate-300">/</span>
            <span className="text-slate-800">
              <Localized>
                {navigation.find((item) => active(item.href))?.label ||
                  "Договор"}
              </Localized>
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center font-semibold md:hidden"
          >
            <Brand />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-950">
              {" "}
              <T text="MVP · Демо" />{" "}
            </span>
            <button
              className="inline-flex min-h-11 min-w-11 items-center justify-center md:hidden"
              onClick={logout}
              disabled={busy}
              aria-label={translate("Выйти", language)}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="error mx-5 mt-4">
            <Localized>{error}</Localized>
          </p>
        )}
        <main className="mx-auto max-w-[1440px] p-4 pb-28 sm:p-5 lg:p-10 md:pb-10">
          {children}
        </main>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
          <LightNavigation
            items={navigation}
            label="Разделы кабинета"
            className="mobile-light-navigation"
          />
        </div>
      </div>
    </div>
  );
}
