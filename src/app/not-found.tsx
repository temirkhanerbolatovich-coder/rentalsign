import { T } from "@/components/language";
import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-12 text-center">
      <h1 className="text-2xl font-semibold">
        {" "}
        <T text="Страница не найдена" />{" "}
      </h1>
      <p className="my-5 text-sm text-slate-500">
        {" "}
        <T text="Проверьте адрес страницы." />{" "}
      </p>
      <Link href="/" className="text-teal-700 underline">
        {" "}
        <T text="На главную" />{" "}
      </Link>
    </main>
  );
}
