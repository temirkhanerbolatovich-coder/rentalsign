"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { clientApi } from "./client-api";

export function CatalogImport({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const property = await clientApi(`/api/catalog/${slug}/property`, "POST");
      router.replace(
        `/contracts/new?propertyId=${encodeURIComponent(property.id)}`,
      );
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="card mx-auto max-w-2xl p-6 sm:p-9">
      <p className="eyebrow mb-3">КВАРТИРА ИЗ КАТАЛОГА</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="my-5 text-sm leading-6 text-slate-600">
        Добавьте квартиру в свои объекты, чтобы подготовить договор. Затем
        укажите согласованные даты, общую стоимость за весь срок и депозит. Это
        действие не бронирует квартиру.
      </p>
      {error && (
        <p role="alert" className="error mb-5">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={prepare} disabled={busy}>
          {busy ? "Добавляем…" : "Добавить объект и продолжить"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/apartments/${slug}`}>Карточка квартиры</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/properties">Мои объекты</Link>
        </Button>
      </div>
    </section>
  );
}
