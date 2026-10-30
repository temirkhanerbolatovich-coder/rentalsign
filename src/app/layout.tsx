import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/language";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const interfaceFont = localFont({
  src: "./fonts/NotoSans-Variable.woff2",
  variable: "--font-interface",
  weight: "100 900",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Qutty Qonaq — договоры аренды",
    template: "%s · Qutty Qonaq",
  },
  description:
    "Каталог квартир с фотографиями и оформление договоров аренды с демонстрационным подписанием. Настоящая ЭЦП не используется.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/qutty-qonaq.png" },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const savedLanguage = (await cookies()).get("qutty-language")?.value;
  const language =
    savedLanguage === "kk" || savedLanguage === "en" ? savedLanguage : "ru";
  return (
    <html lang={language} className={interfaceFont.variable}>
      <body>
        <LanguageProvider initialLanguage={language}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
