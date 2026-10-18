import { z } from "zod";
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Заполните поле")
    .max(max, `Не более ${max} символов`);
const optionalText = (max: number) => z.string().trim().max(max).default("");
const phone = text(24)
  .regex(/^\+?[\d\s()-]{7,24}$/, "Проверьте номер телефона")
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "Номер телефона должен содержать от 7 до 15 цифр");
const identifier = z
  .string()
  .trim()
  .regex(/^(\d{12})?$/, "ИИН/БИН должен содержать 12 цифр или быть пустым")
  .default("");
const amount = z
  .number()
  .int("Сумма должна быть целым числом тенге")
  .min(0)
  .max(100_000_000);
export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const propertySchema = z
  .object({
    name: text(120),
    address: text(300),
    type: z.enum(["APARTMENT", "APARTMENTS", "HOTEL"]),
    unit: optionalText(40),
    description: optionalText(2000),
    rent: amount,
    deposit: amount,
  })
  .strict();
export const contractSchema = z
  .object({
    propertyId: text(100),
    landlordName: text(200),
    landlordId: identifier,
    landlordPhone: phone,
    landlordDocument: z.string().trim().max(200).optional(),
    landlordDocumentIssued: z.string().trim().max(300).optional(),
    tenantName: text(200),
    tenantId: identifier,
    tenantPhone: phone,
    tenantDocument: z.string().trim().max(300).optional(),
    tenantAddress: z.string().trim().max(500).optional(),
    checkIn: z.iso.datetime({ offset: true }),
    checkOut: z.iso.datetime({ offset: true }),
    rent: amount,
    deposit: amount,
    additionalTerms: optionalText(10000),
    obligations: text(10000),
    payment: text(10000),
    depositTerms: text(10000),
    damage: text(10000),
    handover: text(10000),
  })
  .strict()
  .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
    path: ["checkOut"],
    message: "Выезд должен быть позже заезда",
  });
export const issueSchema = z
  .object({
    ttlHours: z.number().int().min(1).max(720),
    revision: z.number().int().positive(),
  })
  .strict();
export const signingSchema = z
  .object({
    acknowledged: z.literal(true, {
      error: "Подтвердите ознакомление с условиями",
    }),
  })
  .strict();
export type ContractInput = z.infer<typeof contractSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type ContractSnapshot = ContractInput & {
  number: string;
  createdAt: string;
  property: PropertyInput;
};
