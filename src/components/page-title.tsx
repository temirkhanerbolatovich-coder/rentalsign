import { Localized } from "@/components/language";
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="title-reveal text-2xl font-semibold tracking-tight text-slate-900 lg:text-[30px]">
          <Localized>{title}</Localized>
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          <Localized>{description}</Localized>
        </p>
      </div>
      {children}
    </div>
  );
}
