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
    default: "RentalSign — договоры аренды",
    template: "%s · RentalSign",
  },
  description:
    "Каталог квартир с фотографиями и оформление договоров аренды с демонстрационным подписанием. Настоящая ЭЦП не используется.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/rentalsign-house-document.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={interfaceFont.variable}>
      <body>{children}</body>
    </html>
  );
}
