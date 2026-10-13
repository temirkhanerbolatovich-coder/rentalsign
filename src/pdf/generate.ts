import PDFDocument from "pdfkit";
import path from "node:path";
import { dateTime, DEMO_WARNING, money, termLabels } from "@/domain/contracts";
import type { ContractSnapshot } from "@/validation/schemas";
/** PDF bytes are generated in memory; documents are never served from public/. */
export function generatePdf(
  snapshot: ContractSnapshot,
  signedAt?: Date | string | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 52, bottom: 64, left: 52, right: 52 },
      bufferPages: true,
      info: { Title: `Демо-договор ${snapshot.number}`, Author: "RentalSign" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      doc.font(path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"));
      const paragraph = (value: string) => {
        doc
          .fontSize(10)
          .fillColor("#253347")
          .text(value, { lineGap: 4, width: 491, paragraphGap: 5 });
        doc.moveDown(0.7);
      };
      const heading = (title: string) => {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(12).fillColor("#126558").text(title);
        doc.moveDown(0.5);
      };
      doc.fontSize(22).fillColor("#152c39").text("RentalSign");
      doc.moveDown(0.5);
      doc.fontSize(15).text(`Договор аренды № ${snapshot.number}`);
      doc.moveDown();
      paragraph(
        `Создан: ${dateTime(snapshot.createdAt)}. Демонстрационный шаблон, не прошедший юридическую проверку.`,
      );
      paragraph(DEMO_WARNING);
      heading("1. Стороны договора");
      paragraph(
        `Арендодатель: ${snapshot.landlordName}\nИИН/БИН: ${snapshot.landlordId || "не указан"}\nТелефон: ${snapshot.landlordPhone}`,
      );
      paragraph(
        `Арендатор: ${snapshot.tenantName}\nИИН: ${snapshot.tenantId || "не указан"}\nТелефон: ${snapshot.tenantPhone}`,
      );
      heading("2. Объект и срок аренды");
      paragraph(
        `${snapshot.property.name}\nАдрес: ${snapshot.property.address}${snapshot.property.unit ? `, помещение ${snapshot.property.unit}` : ""}\n${snapshot.property.description}`,
      );
      paragraph(
        `Заезд: ${dateTime(snapshot.checkIn)}\nВыезд: ${dateTime(snapshot.checkOut)}\nСтоимость аренды: ${money(snapshot.rent)}\nДепозит: ${money(snapshot.deposit)}`,
      );
      let section = 3;
      for (const [key, label] of Object.entries(termLabels)) {
        heading(`${section++}. ${label}`);
        paragraph(snapshot[key as keyof typeof termLabels]);
      }
      if (snapshot.additionalTerms) {
        heading(`${section++}. Дополнительные условия`);
        paragraph(snapshot.additionalTerms);
      }
      if (signedAt) {
        heading("ДЕМО — НЕ ПОДПИСАНО ЭЦП");
        paragraph(
          `Демонстрационное действие зафиксировано сервером: ${dateTime(signedAt)}. Арендатор подтвердил ознакомление с условиями. Сертификат ЭЦП не создавался.`,
        );
      } else {
        heading("ПРЕДВАРИТЕЛЬНЫЙ ДОКУМЕНТ");
        paragraph("Демонстрационное действие ещё не выполнено.");
      }
      const pages = doc.bufferedPageRange();
      for (let index = 0; index < pages.count; index++) {
        doc.switchToPage(index);
        // Reserve footer space so PDFKit cannot create another page while numbering.
        doc.page.margins.bottom = 0;
        doc
          .fontSize(8)
          .fillColor("#64748b")
          .text(`RentalSign • ДЕМО • ${index + 1} / ${pages.count}`, 52, 802, {
            width: 491,
            align: "center",
            lineBreak: false,
          });
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
