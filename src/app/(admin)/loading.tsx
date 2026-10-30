import { T } from "@/components/language";
export default function Loading() {
  return (
    <div role="status" className="space-y-5 animate-pulse">
      <p className="text-sm text-slate-500">
        {" "}
        <T text="Загружаем рабочее пространство…" />{" "}
      </p>
      <div className="h-12 w-72 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-slate-200" />
    </div>
  );
}
