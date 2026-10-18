import { defaultTerms } from "./contracts";
import type { ContractTemplate } from "../validation/contract-template";

export type { ContractTemplate } from "../validation/contract-template";

/** Anonymized terms from the supplied example; personal defaults are stored per owner. */
export function getDefaultContractTemplate(): ContractTemplate {
  return {
    landlordName: "",
    landlordId: "",
    landlordPhone: "",
    landlordDocument: "",
    landlordDocumentIssued: "",
    ...defaultTerms,
    obligations: [
      "Курение в квартире строго запрещено — штраф 100 000 тг.",
      "После 23:00 запрещается шуметь, звонить в домофон и устраивать вечеринки.",
      "В случае жалоб соседей — мгновенное выселение без возврата денежных средств.",
      "Остатки пищи и мусор арендатор убирает самостоятельно.",
      "Запрещено забирать бытовую химию, мыло, туалетную бумагу.",
      "Не прикасаться к стенам и мебели грязными или жирными руками.",
      "Прошу относиться к чужому труду и имуществу с уважением и бережностью.",
    ].join("\n"),
    damage:
      "При выезде проводится проверка квартиры, при нарушениях — штраф выставляется на Kaspi счёт по акту приёма-передачи.",
    handover:
      "Арендодатель передаёт квартиру для временного проживания в чистом и исправном состоянии, с мебелью и бытовой техникой. Стороны осматривают квартиру при заезде и выезде, фиксируют состояние имущества в акте приёма-передачи и передают ключи.",
    additionalTerms: "",
  };
}
