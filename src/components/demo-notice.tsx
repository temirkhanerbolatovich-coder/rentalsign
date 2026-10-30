import { DEMO_WARNING } from "@/domain/contracts";
import { T } from "./language";
import { ShieldAlert } from "lucide-react";
export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 text-amber-900 ${compact ? "p-3 text-xs" : "p-4 text-sm"}`}
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0" />
      <div>
        <strong className="block mb-1">
          <T text="Демонстрационный режим" />
        </strong>
        <p>
          <T
            text={
              compact
                ? "Демоподпись не является ЭЦП. Шаблон договора не прошёл юридическую проверку."
                : DEMO_WARNING +
                  ". Шаблон договора не прошёл юридическую проверку."
            }
          />
        </p>
      </div>
    </div>
  );
}
