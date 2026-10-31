import { T, LanguageSwitcher } from "@/components/language";
import Link from "next/link";
import { LightNavigation } from "@/components/light-navigation";
import { Brand } from "@/components/brand";

export default function ApartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="catalog-shell flex min-h-dvh flex-col">
      <a
        href="#catalog-content"
        className="sr-only rounded bg-white px-4 py-2 text-teal-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        {" "}
        <T text="Перейти к содержимому" />{" "}
      </a>
      <header className="catalog-header border-b border-slate-200 bg-white text-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="order-1 flex items-center gap-2.5"
            aria-label="Qutty Qonaq — главная"
          >
            <span className="text-xl">
              <Brand />
            </span>
          </Link>
          <div className="order-3 w-full sm:order-2 sm:ml-auto sm:w-auto">
            <LightNavigation
              label="Главная навигация"
              items={[
                { href: "/apartments", label: "Каталог квартир" },
                { href: "/login", label: "Вход для владельца" },
              ]}
            />
          </div>
          <div className="order-2 sm:order-3">
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main
        id="catalog-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-8 sm:pt-9"
      >
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-6 text-xs leading-5 text-slate-500 sm:flex-row sm:px-8">
          <p>
            <span className="font-semibold text-slate-700">Qutty Qonaq</span>{" "}
            <T text="· Квартиры и оформление аренды" />{" "}
          </p>
          <p>
            {" "}
            <T text="Даты и условия согласуются с владельцем. Подписание в сервисе демонстрационное." />{" "}
          </p>
        </div>
      </footer>
    </div>
  );
}
