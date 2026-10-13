export const statuses = [
  "DRAFT",
  "PENDING",
  "DEMO_SIGNED",
  "EXPIRED",
  "REVOKED",
] as const;
export type ContractStatus = (typeof statuses)[number];
export const statusLabels: Record<ContractStatus, string> = {
  DRAFT: "Черновик",
  PENDING: "Ожидает подписания",
  DEMO_SIGNED: "Подписан в демо",
  EXPIRED: "Ссылка истекла",
  REVOKED: "Ссылка отозвана",
};
export const propertyTypes: Record<string, string> = {
  APARTMENT: "Квартира",
  APARTMENTS: "Апартаменты",
  HOTEL: "Гостиничный номер",
};
export const DEMO_WARNING =
  "Демонстрационный режим. Настоящая ЭЦП не используется. Это действие не является подписанием документа электронной цифровой подписью";
export const defaultTerms = {
  obligations:
    "Арендодатель передаёт помещение в пригодном для проживания состоянии. Арендатор соблюдает правила проживания, поддерживает чистоту и использует помещение по назначению.",
  payment:
    "Оплата производится до передачи помещения способом, согласованным сторонами. Все суммы указаны в тенге.",
  depositTerms:
    "Депозит возвращается после осмотра помещения и возврата ключей, за вычетом согласованных и подтверждённых расходов на устранение повреждений.",
  damage:
    "Арендатор несёт ответственность за причинённый им ущерб имуществу. Естественный износ не является повреждением.",
  handover:
    "Стороны совместно осматривают помещение при заезде и выезде, проверяют имущество и передают ключи. Состояние помещения фиксируется по соглашению сторон.",
};
export const termLabels: Record<keyof typeof defaultTerms, string> = {
  obligations: "Обязанности сторон",
  payment: "Порядок оплаты",
  depositTerms: "Возврат депозита",
  damage: "Ответственность за повреждения",
  handover: "Передача и возврат помещения",
};
export function effectiveStatus(
  contract: { status: string },
  link?: { expiresAt: Date | string; revokedAt: Date | string | null } | null,
  now = new Date(),
): ContractStatus {
  if (contract.status === "DEMO_SIGNED") return "DEMO_SIGNED";
  if (contract.status === "DRAFT") return "DRAFT";
  if (link?.revokedAt || contract.status === "REVOKED") return "REVOKED";
  if (link && new Date(link.expiresAt) <= now) return "EXPIRED";
  return contract.status as ContractStatus;
}
export function money(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value) + " ₸";
}
export function dateTime(value: Date | string, timeZone = "Asia/Almaty") {
  return new Intl.DateTimeFormat("ru-KZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
export function whatsappUrl(phone: string, url: string, number: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized =
    digits.length === 11 && digits.startsWith("8")
      ? "7" + digits.slice(1)
      : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Здравствуйте! Договор аренды № ${number}: ${url}\nЭто демонстрация: настоящая ЭЦП не используется. Ознакомьтесь с условиями.`)}`;
}
