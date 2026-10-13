"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h2 className="text-xl font-semibold">Не удалось загрузить страницу</h2>
      <p className="my-4 text-sm text-slate-500">
        Проверьте подключение и попробуйте ещё раз.
      </p>
      <Button onClick={reset}>Повторить</Button>
    </div>
  );
}
