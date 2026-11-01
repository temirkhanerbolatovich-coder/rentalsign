"use client";

import { T, Localized, translate, useLanguage } from "@/components/language";

import Link from "next/link";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Save,
  Building2,
  FileText,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "./ui/button";
import { DemoNotice } from "./demo-notice";
import { PageTitle } from "./page-title";
import { ContractDocument } from "./contract-document";
import { clientApi } from "./client-api";
import { termLabels, money } from "@/domain/contracts";
import {
  getDefaultContractTemplate,
  type ContractTemplate,
} from "@/domain/contract-template";
import { findApartment } from "@/catalog/apartments";
import { catalogRent } from "@/domain/rental-pricing";
import { ApartmentPrice } from "./apartment-price";
import {
  contractSchema,
  type ContractInput,
  type ContractSnapshot,
  type PropertyInput,
} from "@/validation/schemas";
type FormProperty = PropertyInput & {
  id: string;
  catalogSlug?: string | null;
  photo: { src: string; alt: string } | null;
};
// Prevent an early edit from being lost before the interactive form hydrates.
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function localTime(value: string) {
  return new Date(new Date(value).getTime() + 5 * 3600000)
    .toISOString()
    .slice(0, 16);
}
const initial = (template: ContractTemplate): ContractInput => {
  const now = Math.floor(Date.now() / 60000) * 60000;
  return {
    ...template,
    propertyId: "",
    tenantName: "",
    tenantId: "",
    tenantPhone: "",
    tenantDocument: "",
    tenantAddress: "",
    checkIn: new Date(now + 86400000).toISOString(),
    checkOut: new Date(now + 2 * 86400000).toISOString(),
    rent: 0,
    deposit: 0,
  };
};
function hasCatalogDailyRate(slug?: string | null) {
  const apartment = slug ? findApartment(slug) : undefined;
  return Boolean(
    apartment &&
    apartment.pricingPeriod === "day" &&
    apartment.priceMin !== null,
  );
}
export function ContractForm({
  properties,
  existing,
  selectedPropertyId,
  templateDefaults = getDefaultContractTemplate(),
}: {
  properties: FormProperty[];
  existing?: { id: string; revision: number; snapshot: ContractSnapshot };
  selectedPropertyId?: string;
  templateDefaults?: ContractTemplate;
}) {
  const language = useLanguage();
  const ready = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady,
  );
  const router = useRouter();
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const [data, setData] = useState<ContractInput>(() => {
    if (existing?.snapshot) {
      return contractSchema.parse(
        Object.fromEntries(
          Object.entries(existing.snapshot).filter(
            ([key]) => !["number", "createdAt", "property"].includes(key),
          ),
        ),
      );
    }
    const initialData = initial(templateDefaults);
    return {
      ...initialData,
      propertyId: selectedPropertyId || "",
      rent: hasCatalogDailyRate(selectedProperty?.catalogSlug)
        ? (catalogRent(
            selectedProperty?.catalogSlug,
            initialData.checkIn,
            initialData.checkOut,
          )?.total ?? 0)
        : selectedProperty?.rent || 0,
      deposit: selectedProperty?.deposit || 0,
    };
  });
  const [automaticRent, setAutomaticRent] = useState(
    !existing && hasCatalogDailyRate(selectedProperty?.catalogSlug),
  );
  const [discount, setDiscount] = useState(0);
  const [preview, setPreview] = useState(false);
  const [landlordOpen] = useState(() => {
    const landlord = existing?.snapshot ?? templateDefaults;
    return !landlord.landlordName || !landlord.landlordPhone;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const property = properties.find((p) => p.id === data.propertyId);
  const apartment = property?.catalogSlug
    ? findApartment(property.catalogSlug)
    : undefined;
  const suggestedRent = catalogRent(
    property?.catalogSlug,
    data.checkIn,
    data.checkOut,
  );
  function update(key: keyof ContractInput, value: string | number) {
    if (key === "rent") {
      setAutomaticRent(false);
      setDiscount(0);
    }
    setData((previous) => {
      const next = { ...previous, [key]: value };
      if (automaticRent && (key === "checkIn" || key === "checkOut")) {
        const calculated = catalogRent(
          property?.catalogSlug,
          next.checkIn,
          next.checkOut,
        );
        next.rent =
          calculated &&
          Number.isSafeInteger(discount) &&
          discount >= 0 &&
          discount < calculated.total
            ? calculated.total - discount
            : 0;
      }
      return next;
    });
  }
  function validate() {
    const parsed = contractSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return false;
    }
    if (!property) {
      setError("Выберите объект недвижимости");
      return false;
    }
    if (property.catalogSlug && data.rent <= 0) {
      setError("Укажите согласованную стоимость аренды за весь срок");
      return false;
    }
    setError("");
    return true;
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const result = await clientApi(
        existing ? `/api/contracts/${existing.id}` : "/api/contracts",
        existing ? "PATCH" : "POST",
        existing ? { content: data, revision: existing.revision } : data,
      );
      router.push(`/contracts/${result.id}?saved=1`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function textField(
    key: keyof ContractInput,
    label: string,
    options: { optional?: boolean; max?: number; type?: string } = {},
  ) {
    return (
      <label key={key} className="block">
        <span className="label">
          <Localized>{label}</Localized>
          {options.optional && (
            <span className="ml-1 font-normal text-slate-400">
              {" "}
              <T text="(необязательно)" />{" "}
            </span>
          )}
        </span>
        <input
          className="field"
          value={data[key] ?? ""}
          onChange={(e) => update(key, e.target.value)}
          type={options.type || "text"}
          required={!options.optional}
          maxLength={options.max || 200}
          autoComplete="off"
        />
      </label>
    );
  }
  const snapshot: ContractSnapshot | undefined = property
    ? {
        ...data,
        property,
        number: existing?.snapshot.number || "Будет присвоен при сохранении",
        createdAt: existing?.snapshot.createdAt || new Date().toISOString(),
      }
    : undefined;
  return (
    <>
      <Link
        href={existing ? `/contracts/${existing.id}` : "/contracts"}
        className="mb-5 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft size={14} /> <T text="Назад к договорам" />{" "}
      </Link>
      <PageTitle
        title={existing ? "Редактировать черновик" : "Новый договор"}
        description={
          existing
            ? "Измените данные черновика и проверьте договор перед сохранением."
            : "Выберите квартиру, заполните арендатора и срок. Реквизиты и условия уже подготовлены из шаблона."
        }
      />
      <div className="mb-6">
        <DemoNotice compact />
      </div>
      <ol
        aria-label={translate("Порядок подготовки договора", language)}
        className="mb-6 flex flex-wrap gap-2 text-xs text-slate-700"
      >
        {[
          "Объект и срок",
          "Стороны",
          "Условия и сумма",
          "Проверка",
          "Сохранение",
        ].map((step, index) => (
          <li
            key={step}
            className="rounded-full border border-slate-200 bg-white px-3 py-2"
          >
            <span className="mr-1 font-semibold text-amber-800">
              {index + 1}.
            </span>{" "}
            <Localized>{step}</Localized>
          </li>
        ))}
      </ol>
      {!properties.length && (
        <p className="error mb-5">
          {" "}
          <T text="Для создания договора" />{" "}
          <Link href="/properties" className="underline">
            {" "}
            <T text="добавьте действующий объект" />{" "}
          </Link>
          .
        </p>
      )}
      <form
        onSubmit={save}
        onInvalidCapture={(event) => {
          const section = (event.target as HTMLElement).closest("details");
          if (section) section.open = true;
        }}
      >
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="space-y-5">
            {preview && snapshot ? (
              <ContractDocument snapshot={snapshot} />
            ) : (
              <>
                <section className="card p-5 sm:p-7">
                  <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                    <Building2 size={18} className="text-teal-700" />{" "}
                    <T text="Объект и срок аренды" />{" "}
                  </h2>
                  <label className="mb-5 block">
                    <span className="label">
                      {" "}
                      <T text="Объект недвижимости" />{" "}
                    </span>
                    <select
                      required
                      className="field"
                      disabled={!ready}
                      value={data.propertyId}
                      onChange={(e) => {
                        const p = properties.find(
                          (p) => p.id === e.target.value,
                        );
                        const propertyId = e.target.value;
                        setAutomaticRent(hasCatalogDailyRate(p?.catalogSlug));
                        setDiscount(0);
                        setData((previous) => ({
                          ...previous,
                          propertyId,
                          rent: hasCatalogDailyRate(p?.catalogSlug)
                            ? (catalogRent(
                                p?.catalogSlug,
                                previous.checkIn,
                                previous.checkOut,
                              )?.total ?? 0)
                            : p?.rent || 0,
                          deposit: p?.deposit || 0,
                        }));
                      }}
                    >
                      <option value="">
                        {" "}
                        <T text="Выберите объект" />{" "}
                      </option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {property && (
                    <div className="mb-5 flex gap-4 rounded-lg bg-slate-50 p-4">
                      {property.photo && (
                        <Image
                          src={property.photo.src}
                          alt={property.photo.alt}
                          unoptimized={property.photo.src.startsWith(
                            "/api/property-photos/",
                          )}
                          width={80}
                          height={80}
                          className="size-20 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="self-center text-xs leading-5 text-slate-500">
                        <p className="font-medium text-slate-900">
                          {property.name}
                        </p>
                        <p>
                          {property.address}
                          <Localized>
                            {property.unit ? `, кв. ${property.unit}` : ""}
                          </Localized>
                        </p>
                        {apartment && (
                          <p>
                            {" "}
                            <T text="Подъезд" /> {apartment.entrance}{" "}
                            <T text="· Этаж" /> {apartment.floor}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {apartment && (
                    <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50 p-4 text-xs leading-5 text-teal-900">
                      <Link
                        href={`/apartments/${apartment.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-4"
                      >
                        {" "}
                        <T text="Фото, цена и расположение квартиры" />{" "}
                      </Link>
                      <p className="mt-2">
                        {" "}
                        {hasCatalogDailyRate(apartment.slug) ? (
                          existing && !automaticRent ? (
                            <T text="Сумма сохранена в черновике и не пересчитывается автоматически. При необходимости запустите пересчёт." />
                          ) : (
                            <T text="Сумма рассчитывается по суточной цене из каталога. Вы можете изменить её вручную или сделать скидку." />
                          )
                        ) : (
                          <T text="Укажите итоговую стоимость вручную." />
                        )}{" "}
                      </p>
                      <p className="mt-2">
                        <T text="Цена за сутки" />:{" "}
                        <ApartmentPrice apartment={apartment} />
                        {suggestedRent && (
                          <>
                            {" "}
                            · {suggestedRent.days} <T text="сут." /> ·{" "}
                            <T
                              text={
                                suggestedRent.maxDailyRate !== null &&
                                suggestedRent.maxDailyRate !==
                                  suggestedRent.dailyRate
                                  ? "Расчёт от нижней границы цены"
                                  : "Расчёт по цене каталога"
                              }
                            />
                            : {money(suggestedRent.total)}
                          </>
                        )}
                      </p>
                      {suggestedRent && !automaticRent && (
                        <button
                          type="button"
                          className="mt-2 font-semibold underline underline-offset-4"
                          onClick={() => {
                            setData((previous) => ({
                              ...previous,
                              rent: suggestedRent.total,
                            }));
                            setAutomaticRent(true);
                          }}
                        >
                          <T text="Рассчитать заново по цене сайта" />
                        </button>
                      )}
                      {apartment.arrivalInstructions && (
                        <p className="mt-2 font-medium">
                          {apartment.arrivalInstructions}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    {(["checkIn", "checkOut"] as const).map((key) => (
                      <label key={key}>
                        <span className="label">
                          <Localized>
                            {key === "checkIn"
                              ? "Дата и время заезда"
                              : "Дата и время выезда"}
                          </Localized>
                        </span>
                        <input
                          className="field"
                          type="datetime-local"
                          disabled={!ready}
                          required
                          value={localTime(data[key])}
                          onChange={(e) => {
                            if (e.target.value)
                              update(
                                key,
                                new Date(
                                  e.target.value + ":00+05:00",
                                ).toISOString(),
                              );
                          }}
                        />
                      </label>
                    ))}
                    {(["rent", "deposit"] as const).map((key) => (
                      <label key={key}>
                        <span className="label">
                          <Localized>
                            {key === "rent"
                              ? "Аренда за весь срок, ₸"
                              : "Депозит, ₸"}
                          </Localized>
                        </span>
                        <input
                          className="field"
                          type="number"
                          disabled={!ready}
                          min={key === "rent" && property?.catalogSlug ? 1 : 0}
                          max={100000000}
                          step={1}
                          required
                          value={data[key]}
                          onChange={(e) => update(key, Number(e.target.value))}
                        />
                      </label>
                    ))}
                  </div>
                  {suggestedRent && (
                    <div className="mt-5">
                      <label className="block max-w-xs">
                        <span className="label">
                          <T text="Скидка, ₸" />
                        </span>
                        <input
                          className="field"
                          type="number"
                          disabled={!ready}
                          min={0}
                          max={suggestedRent.total - 1}
                          step={1}
                          value={discount}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setDiscount(value);
                            setAutomaticRent(true);
                            setData((previous) => ({
                              ...previous,
                              rent:
                                Number.isSafeInteger(value) &&
                                value >= 0 &&
                                value < suggestedRent.total
                                  ? suggestedRent.total - value
                                  : 0,
                            }));
                          }}
                        />
                      </label>
                      <p className="mt-2 text-xs text-slate-500">
                        <T text="Скидка вычитается из рассчитанной суммы. В договор попадёт итоговая стоимость." />
                      </p>
                      {(!Number.isSafeInteger(discount) ||
                        discount < 0 ||
                        discount >= suggestedRent.total) && (
                        <p role="alert" className="error mt-2">
                          <T text="Скидка должна быть меньше рассчитанной суммы." />
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-4 text-[11px] text-slate-400">
                    {" "}
                    <T text="Время: Казахстан, Asia/Almaty (UTC+5). Стоимость за весь указанный период." />{" "}
                  </p>
                </section>
                {(["tenant", "landlord"] as const).map((party) => (
                  <section key={party} className="card p-5 sm:p-7">
                    <details open={party === "tenant" || landlordOpen}>
                      <summary className="cursor-pointer text-base font-semibold">
                        <Localized>
                          {party === "landlord"
                            ? "Реквизиты арендодателя"
                            : "Арендатор"}
                        </Localized>
                        {party === "landlord" && data.landlordName && (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {data.landlordName}
                          </span>
                        )}
                      </summary>
                      {party === "landlord" && (
                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          <Localized>
                            {existing
                              ? "Реквизиты сохранены в этом черновике."
                              : "Данные взяты из шаблона."}
                          </Localized>{" "}
                          <T text="Здесь их можно изменить только для этого договора." />{" "}
                          <Link
                            href="/templates"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-700 underline"
                          >
                            {" "}
                            <T text="Настроить шаблон" />{" "}
                          </Link>
                        </p>
                      )}
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          {textField(
                            `${party}Name`,
                            party === "landlord"
                              ? "ФИО или название организации"
                              : "ФИО арендатора",
                          )}
                        </div>
                        {textField(`${party}Phone`, "Контактный телефон", {
                          max: 24,
                          type: "tel",
                        })}
                        {textField(
                          `${party}Id`,
                          party === "landlord" ? "ИИН / БИН" : "ИИН",
                          { optional: true, max: 12 },
                        )}
                        {party === "tenant" ? (
                          <>
                            {textField(
                              "tenantDocument",
                              "Удостоверение личности / паспорт, №",
                              { optional: true, max: 300 },
                            )}
                            {textField(
                              "tenantAddress",
                              "Адрес проживания арендатора",
                              { optional: true, max: 500 },
                            )}
                          </>
                        ) : (
                          <>
                            {textField(
                              "landlordDocument",
                              "Удостоверение личности, №",
                              { optional: true, max: 200 },
                            )}
                            {textField(
                              "landlordDocumentIssued",
                              "Кем и когда выдано",
                              { optional: true, max: 300 },
                            )}
                          </>
                        )}
                      </div>
                    </details>
                  </section>
                ))}
                <section className="card p-5 sm:p-7">
                  <details>
                    <summary className="cursor-pointer text-base font-semibold">
                      <FileText
                        size={18}
                        className="mr-2 inline text-teal-700"
                      />{" "}
                      <T text="Условия договора" />{" "}
                    </summary>
                    <p className="mb-5 text-xs leading-5 text-slate-500">
                      {" "}
                      <T text="Условия уже заполнены. Любые изменения здесь относятся только к этому договору. Перед реальным применением нужна юридическая проверка." />{" "}
                    </p>
                    <div className="space-y-5">
                      {Object.entries(termLabels).map(([key, label]) => (
                        <label key={key} className="block">
                          <span className="label">
                            <Localized>{label}</Localized>
                          </span>
                          <textarea
                            className="field min-h-28"
                            value={data[key as keyof typeof termLabels]}
                            onChange={(e) =>
                              update(
                                key as keyof typeof termLabels,
                                e.target.value,
                              )
                            }
                            required
                            maxLength={10000}
                          />
                        </label>
                      ))}
                      <label className="block">
                        <span className="label">
                          {" "}
                          <T text="Дополнительные условия" />{" "}
                        </span>
                        <textarea
                          className="field min-h-24"
                          value={data.additionalTerms}
                          onChange={(e) =>
                            update("additionalTerms", e.target.value)
                          }
                          maxLength={10000}
                          placeholder={translate(
                            "Например, правила проживания и возврата ключей",
                            language,
                          )}
                        />
                      </label>
                    </div>
                  </details>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {" "}
                    <T text="Правила проживания и порядок передачи квартиры взяты из" />{" "}
                    <Localized>
                      {existing ? "сохранённого черновика" : "вашего шаблона"}
                    </Localized>{" "}
                    <T text=". Проверьте их в предварительном просмотре." />{" "}
                  </p>
                </section>
              </>
            )}
          </div>
          <aside className="card p-6 xl:sticky xl:top-6">
            <p className="eyebrow">
              {" "}
              <T text="ВАШ ДОГОВОР" />{" "}
            </p>
            <h2 className="mt-3 text-lg font-semibold">
              {" "}
              <T text="Готовим к отправке" />{" "}
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {" "}
              <T text="Сначала сохраните черновик. Персональную ссылку можно создать после проверки." />{" "}
            </p>
            <div className="my-6 space-y-3 border-y border-slate-100 py-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {" "}
                  <T text="Аренда" />{" "}
                </span>
                <span className="font-medium">{money(data.rent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {" "}
                  <T text="Депозит" />{" "}
                </span>
                <span className="font-medium">{money(data.deposit)}</span>
              </div>
            </div>
            <p className="mb-5 flex gap-2 text-xs leading-5 text-slate-500">
              <Check size={15} className="mt-0.5 shrink-0 text-teal-700" />{" "}
              <T text="После отправки текст фиксируется и больше не редактируется." />{" "}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mb-3 w-full"
              onClick={() => {
                if (preview) setPreview(false);
                else if (validate()) setPreview(true);
              }}
            >
              {preview ? <Pencil /> : <Eye />}
              <Localized>
                {preview ? "Вернуться к форме" : "Предварительный просмотр"}
              </Localized>
            </Button>
            <Button className="w-full" disabled={busy || !properties.length}>
              <Save />
              <Localized>
                {busy ? "Сохраняем…" : "Сохранить черновик"}
              </Localized>
            </Button>
            {error && (
              <p role="alert" className="error mt-4">
                <Localized>{error}</Localized>
              </p>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}
