"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import translations from "@/lib/translations.json";
export type Language = "ru" | "kk" | "en";
const LanguageContext = createContext<Language>("ru");
export function translate(text: string, language: Language): string {
  const entry = (translations as Record<string, string[]>)[text.trim()];
  if (language === "ru") return text;
  if (entry) return entry[language === "kk" ? 0 : 1];
  const count = text.match(/^Показано (\d+) из (\d+) договоров$/);
  if (count)
    return language === "kk"
      ? `${count[2]} шарттың ${count[1]} көрсетілген`
      : `Showing ${count[1]} of ${count[2]} agreements`;
  const imported = text.match(
    /^Добавлено квартир: (\d+)\. Всего из каталога: (\d+)\.$/,
  );
  if (imported)
    return language === "kk"
      ? `Қосылған пәтерлер: ${imported[1]}. Каталогтан барлығы: ${imported[2]}.`
      : `Apartments added: ${imported[1]}. Total from catalog: ${imported[2]}.`;
  const unit = text.match(/^, кв\. (.+)$/);
  if (unit)
    return language === "kk" ? `, пәтер ${unit[1]}` : `, apt. ${unit[1]}`;
  const location = text.match(/^ · (\d+) этаж · (\d+) подъезд$/);
  if (location)
    return language === "kk"
      ? ` · ${location[1]} қабат · ${location[2]} кіреберіс`
      : ` · Floor ${location[1]} · Entrance ${location[2]}`;
  return text
    .replace(/^Квартира на /, language === "kk" ? "Пәтер: " : "Apartment on ")
    .replace(
      /^Квартира в ЖК /,
      language === "kk" ? "ТК пәтері: " : "Apartment in ",
    );
}
function readLanguage(): Language {
  return (
    (document.cookie.match(
      /(?:^|; )qutty-language=(ru|kk|en)(?:;|$)/,
    )?.[1] as Language) || "ru"
  );
}
function subscribe(onChange: () => void) {
  window.addEventListener("qutty-language-change", onChange);
  return () => window.removeEventListener("qutty-language-change", onChange);
}
export function LanguageProvider({
  children,
  initialLanguage = "ru",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const language = useSyncExternalStore(
    subscribe,
    readLanguage,
    () => initialLanguage,
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return (
    <LanguageContext.Provider value={language}>
      <div className="border-b border-amber-100 bg-[#fffbed] px-4 py-1.5 text-right">
        <div
          className="mx-auto flex max-w-7xl justify-end gap-1"
          role="group"
          aria-label="Language / Тіл / Язык"
        >
          {(
            [
              ["ru", "РУС"],
              ["kk", "ҚАЗ"],
              ["en", "EN"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={language === value}
              onClick={() => {
                document.cookie = `qutty-language=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
                document.documentElement.lang = value;
                window.dispatchEvent(new Event("qutty-language-change"));
              }}
              className={`min-h-9 min-w-11 rounded-lg px-2 text-xs font-semibold ${language === value ? "bg-amber-200 text-amber-950" : "text-slate-600 hover:bg-amber-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  return useContext(LanguageContext);
}
export function T({ text }: { text: string }) {
  return translate(text, useLanguage());
}

export function Localized({ children }: { children: React.ReactNode }) {
  const language = useLanguage();
  return typeof children === "string"
    ? translate(children, language)
    : children;
}

export function LocaleDate({ value }: { value: string | Date }) {
  const language = useLanguage();
  return new Intl.DateTimeFormat(
    language === "kk" ? "kk-KZ" : language === "en" ? "en-GB" : "ru-KZ",
    { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" },
  ).format(new Date(value));
}
