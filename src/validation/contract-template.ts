import { z } from "zod";
import { contractSchema } from "./schemas";

const optionalText = (max: number) => z.string().trim().max(max).default("");

/** Private owner defaults. Tenant, apartment, dates and amounts belong to a contract. */
export const contractTemplateSchema = z
  .object({
    landlordName: optionalText(200),
    landlordId: contractSchema.shape.landlordId,
    landlordPhone: contractSchema.shape.landlordPhone
      .or(z.literal(""))
      .default(""),
    landlordDocument: optionalText(200),
    landlordDocumentIssued: optionalText(300),
    obligations: contractSchema.shape.obligations,
    payment: contractSchema.shape.payment,
    depositTerms: contractSchema.shape.depositTerms,
    damage: contractSchema.shape.damage,
    handover: contractSchema.shape.handover,
    additionalTerms: optionalText(10000),
  })
  .strict();

export type ContractTemplate = z.infer<typeof contractTemplateSchema>;
