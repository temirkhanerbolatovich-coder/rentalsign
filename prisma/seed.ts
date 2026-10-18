import "dotenv/config";
import { db } from "../src/lib/db";
import { defaultTerms } from "../src/domain/contracts";
import {
  createContract,
  issueLink,
  revokeLink,
} from "../src/services/contracts";
import { demoSigningProvider } from "../src/signing/demo-provider";
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Seed с демонстрационными данными запрещён в production");
  const admin = await db.admin.findUnique({
    where: { email: process.env.ADMIN_EMAIL || "" },
  });
  if (!admin)
    throw new Error("Сначала создайте администратора и задайте ADMIN_EMAIL");
  if (
    (await db.property.count({ where: { ownerId: admin.id } })) ||
    (await db.contract.count({ where: { ownerId: admin.id } }))
  ) {
    console.log(
      "Объекты или договоры уже существуют: seed пропущен, данные сохранены",
    );
    return;
  }
  const properties = await Promise.all(
    [
      {
        name: "ДЕМО • Квартира «Светлая»",
        address: "Демонстрационный город, улица Примерная, 12",
        type: "APARTMENT",
        unit: "24",
        description: "Вымышленный объект. Две комнаты, кухня и балкон.",
        rent: 25000,
        deposit: 20000,
      },
      {
        name: "ДЕМО • Апартаменты «Панорама»",
        address: "Демонстрационный город, проспект Учебный, 8",
        type: "APARTMENTS",
        unit: "15",
        description: "Вымышленный объект для демонстрации сервиса.",
        rent: 35000,
        deposit: 30000,
      },
      {
        name: "ДЕМО • Номер «Комфорт»",
        address: "Демонстрационный город, переулок Тестовый, 3",
        type: "HOTEL",
        unit: "302",
        description: "Вымышленный гостиничный номер.",
        rent: 18000,
        deposit: 10000,
      },
    ].map((data) =>
      db.property.create({ data: { ...data, ownerId: admin.id } }),
    ),
  );
  for (let index = 0; index < 5; index++) {
    const property = properties[index % properties.length];
    const checkIn = new Date(Date.now() + (index + 1) * 86400000);
    const contract = await createContract(admin.id, {
      propertyId: property.id,
      landlordName: "ДЕМО • Арендодатель Пример",
      landlordId: "",
      landlordPhone: "+7 000 000 00 00",
      tenantName: `ДЕМО • Арендатор ${index + 1}`,
      tenantId: "",
      tenantPhone: "+7 000 000 00 00",
      checkIn: checkIn.toISOString(),
      checkOut: new Date(checkIn.getTime() + 3 * 86400000).toISOString(),
      rent: property.rent,
      deposit: property.deposit,
      additionalTerms:
        "Все данные вымышлены. Демонстрационный шаблон не прошёл юридическую проверку.",
      ...defaultTerms,
    });
    if (index === 0) continue;
    const link = await issueLink(admin.id, contract.id, 72, 1);
    if (index === 2)
      await demoSigningProvider.sign(link.url.split("/").at(-1)!, true);
    if (index === 3)
      await db.signingLink.updateMany({
        where: { version: { contractId: contract.id } },
        data: { expiresAt: new Date(Date.now() - 3600000) },
      });
    if (index === 4) await revokeLink(admin.id, contract.id);
  }
  console.log(
    "Созданы 3 вымышленных объекта и 5 договоров со всеми статусами. Seed не выводит персональные ссылки",
  );
}
main()
  .catch(() => {
    console.error("Seed не выполнен: проверьте конфигурацию и базу данных");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
