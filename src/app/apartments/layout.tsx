import Link from "next/link";
import { ArrowUpRight, PenLine } from "lucide-react";

export default function ApartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#catalog-content"
        className="sr-only rounded bg-white px-4 py-2 text-teal-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Перейти к содержимому
      </a>
      <header className="border-b border-white/10 bg-[#142d36] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="RentalSign — главная"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-teal-400/15 text-teal-300">
              <PenLine size={20} aria-hidden="true" />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              RentalSign<span className="text-teal-300">.</span>
            </span>
          </Link>
          <nav
            aria-label="Главная навигация"
            className="flex items-center gap-5 text-sm sm:gap-8"
          >
            <Link href="/apartments" className="text-white hover:text-teal-200">
              Каталог квартир
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              Вход для владельца <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>
      <main
        id="catalog-content"
        className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 pt-9 sm:px-8 sm:pt-12"
      >
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-6 text-xs leading-5 text-slate-500 sm:flex-row sm:px-8">
          <p>
            <span className="font-semibold text-slate-700">RentalSign</span> ·
            Квартиры и оформление аренды
          </p>
          <p>
            Даты и условия согласуются с владельцем. Подписание в сервисе
            демонстрационное.
          </p>
        </div>
      </footer>
    </div>
  );
}
