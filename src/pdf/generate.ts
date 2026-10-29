import PDFDocument from "pdfkit";
import path from "node:path";
import { dateTime, DEMO_WARNING, money } from "@/domain/contracts";
import type { ContractSnapshot } from "@/validation/schemas";

/** Render the saved contract snapshot in memory without exposing a public file. */
export function generatePdf(
  snapshot: ContractSnapshot,
  signedAt?: Date | string | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 56, bottom: 64, left: 64, right: 64 },
      bufferPages: true,
      info: { Title: `Демо-договор ${snapshot.number}`, Author: "RentalSign" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      doc.registerFont("regular", path.join(process.cwd(), "assets/fonts/NotoSerif-Regular.ttf"));
      doc.registerFont("bold", path.join(process.cwd(), "assets/fonts/NotoSerif-Bold.ttf"));
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const normal = () => doc.font("regular").fontSize(10).fillColor("#191919");
      const paragraph = (value: string) => {
        normal().text(value, { width, lineGap: 2, paragraphGap: 4 });
        doc.moveDown(0.35);
      };
      const heading = (value: string, minimumSpace = 70) => {
        if (doc.y > doc.page.height - doc.page.margins.bottom - minimumSpace) doc.addPage();
        doc.moveDown(0.35);
        doc.font("bold").fontSize(10.5).fillColor("#191919").text(value, { width, align: "center" });
        doc.moveDown(0.4);
      };
      const label = (value: string) => {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 42) doc.addPage();
        doc.font("bold").fontSize(10).fillColor("#191919").text(value, { width });
        doc.moveDown(0.2);
      };

      const documentTitle = snapshot.property.type === "APARTMENT"
        ? "ДОГОВОР АРЕНДЫ КВАРТИРЫ"
        : snapshot.property.type === "APARTMENTS"
          ? "ДОГОВОР АРЕНДЫ АПАРТАМЕНТОВ"
          : "ДОГОВОР АРЕНДЫ ПОМЕЩЕНИЯ";
      doc.font("bold").fontSize(13).fillColor("#191919").text(documentTitle, { width, align: "center" });
      doc.moveDown(0.35);
      normal().text(`№ ${snapshot.number}`, { width, align: "center" });
      doc.moveDown(0.3);
      normal().text(`Дата создания: ${dateTime(snapshot.createdAt)}`, { width, align: "right" });
      doc.moveDown(0.65);
      doc.font("bold").fontSize(9).text("ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ", { width });
      normal().fontSize(9).text(`${DEMO_WARNING}. Шаблон не прошёл юридическую проверку.`, { width, lineGap: 1 });
      doc.moveDown(0.8);

      label("АРЕНДОДАТЕЛЬ");
      paragraph([
        `ФИО / название: ${snapshot.landlordName}`,
        `ИИН/БИН: ${snapshot.landlordId || "не указан"}`,
        snapshot.landlordDocument ? `Удостоверение личности: ${snapshot.landlordDocument}` : "",
        snapshot.landlordDocumentIssued ? `Кем и когда выдано: ${snapshot.landlordDocumentIssued}` : "",
        `Телефон: ${snapshot.landlordPhone}`,
      ].filter(Boolean).join("\n"));
      label("АРЕНДАТОР");
      paragraph([
        `ФИО: ${snapshot.tenantName}`,
        `ИИН: ${snapshot.tenantId || "не указан"}`,
        snapshot.tenantDocument ? `Удостоверение личности / паспорт: ${snapshot.tenantDocument}` : "",
        snapshot.tenantAddress ? `Адрес проживания: ${snapshot.tenantAddress}` : "",
        `Телефон: ${snapshot.tenantPhone}`,
      ].filter(Boolean).join("\n"));

      heading("1. Объект аренды и передача");
      paragraph([
        `Объект: ${snapshot.property.name}`,
        `Адрес: ${snapshot.property.address}${snapshot.property.unit ? `, помещение ${snapshot.property.unit}` : ""}`,
        snapshot.property.description ? `Описание: ${snapshot.property.description}` : "",
      ].filter(Boolean).join("\n"));
      label("Передача и возврат помещения");
      paragraph(snapshot.handover);

      heading("2. Условия проживания и ответственность");
      label("Обязанности сторон");
      paragraph(snapshot.obligations);
      label("Ответственность за повреждения");
      paragraph(snapshot.damage);

      heading("3. Оплата и срок аренды", 130);
      paragraph([
        `Заезд: ${dateTime(snapshot.checkIn)}`,
        `Выезд: ${dateTime(snapshot.checkOut)}`,
        `Аренда за весь срок: ${money(snapshot.rent)}`,
        `Депозит: ${money(snapshot.deposit)}`,
      ].join("\n"));
      label("Порядок оплаты");
      paragraph(snapshot.payment);
      label("Возврат депозита");
      paragraph(snapshot.depositTerms);
      if (snapshot.additionalTerms) {
        heading("4. Дополнительные условия");
        paragraph(snapshot.additionalTerms);
      }

      heading("Статус документа");
      if (signedAt) {
        label("ДЕМО — НЕ ПОДПИСАНО ЭЦП");
        paragraph(`Демонстрационное действие зафиксировано сервером: ${dateTime(signedAt)}. Арендатор подтвердил ознакомление с условиями. Сертификат ЭЦП не создавался.`);
      } else {
        label("ПРЕДВАРИТЕЛЬНЫЙ ДОКУМЕНТ");
        paragraph("Демонстрационное действие ещё не выполнено.");
      }

      heading("Подписи сторон на бумаге");
      paragraph("Поля для собственноручных подписей при оформлении на бумаге. Сервис не проставляет подписи в PDF.");
      paragraph("Арендодатель: ______________________________\nАрендатор: _________________________________");

      const pages = doc.bufferedPageRange();
      for (let index = 0; index < pages.count; index++) {
        doc.switchToPage(index);
        // The reserved footer must not cause PDFKit to create another page.
        doc.page.margins.bottom = 0;
        doc.font("regular").fontSize(8).fillColor("#555555").text(
          `RentalSign • ДЕМО • ${index + 1} / ${pages.count}`,
          64,
          doc.page.height - 36,
          { width, align: "center", lineBreak: false },
        );
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}

export function pdfResponse(bytes: Buffer, number: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
