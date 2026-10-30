import { T } from "@/components/language";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApartmentNotFound() {
  return (
    <div className="py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">
        {" "}
        <T text="Квартира не найдена" />{" "}
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        {" "}
        <T text="Возможно, адрес страницы изменился. Посмотрите другие варианты в каталоге." />{" "}
      </p>
      <Button asChild className="mt-6">
        <Link href="/apartments">
          <ArrowLeft aria-hidden="true" /> <T text="Каталог квартир" />{" "}
        </Link>
      </Button>
    </div>
  );
}
