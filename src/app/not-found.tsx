import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-12 text-center">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="my-5 text-sm text-slate-500">Проверьте адрес страницы.</p>
      <Link href="/" className="text-teal-700 underline">
        На главную
      </Link>
    </main>
  );
}
