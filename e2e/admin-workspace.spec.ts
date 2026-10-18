import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { apartments } from "../src/catalog/apartments";

const origin = "http://localhost:3100";
let restoreState:
  | {
      defaults: Record<string, unknown>;
      property?: { id: string; input: Record<string, unknown> };
    }
  | undefined;

test.afterEach(async ({ page }) => {
  if (!restoreState) return;
  const restored = await page.request.put("/api/contract-template", {
    data: restoreState.defaults,
    headers: { Origin: origin },
    timeout: 10000,
  });
  expect(restored.ok()).toBe(true);
  if (restoreState.property) {
    const property = restoreState.property;
    const restoredProperty = await page.request.patch(
      `/api/properties/${property.id}`,
      {
        data: property.input,
        headers: { Origin: origin },
        timeout: 10000,
      },
    );
    expect(restoredProperty.ok()).toBe(true);
  }
  restoreState = undefined;
});

test("private template and apartment workspace prepare a contract with minimal repeated entry", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/contract-template")).status()).toBe(401);
  expect(
    (
      await request.put("/api/contract-template", {
        data: {},
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/catalog/import", { headers: { Origin: origin } })
    ).status(),
  ).toBe(401);

  await page.goto("/login");
  await page.getByLabel("Email администратора").fill("fictional@e2e.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const savedDefaults = await (
    await page.request.get("/api/contract-template")
  ).json();
  restoreState = { defaults: savedDefaults };
  const landlordName = "ДЕМО • Проверочный владелец личного шаблона";
  const landlordDocument = "Проверочное удостоверение 000001";
  const additionalTerms =
    "Проверочное условие: передать ключи при совместном осмотре.";
  expect(
    (
      await page.request.put("/api/contract-template", {
        data: savedDefaults,
        headers: { Origin: "https://evil.test" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.put("/api/contract-template", {
        data: { ...savedDefaults, ownerId: "another-owner" },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/catalog/import", {
        headers: { Origin: "https://evil.test" },
      })
    ).status(),
  ).toBe(403);

  await page.goto("/templates");
  await expect(
    page.getByRole("heading", { name: "Шаблон договора", exact: true }),
  ).toBeVisible();
  await page.getByLabel("ФИО или название организации").fill(landlordName);
  await page.getByLabel("Контактный телефон").fill("+7 000 000 00 00");
  await page
    .getByLabel("Удостоверение личности, №", { exact: true })
    .fill(landlordDocument);
  await page.getByLabel("Кем и когда выдано").fill("Проверочный орган выдачи");
  await page.getByLabel("Дополнительные условия").fill(additionalTerms);
  const paymentSummary = page
    .locator("summary")
    .filter({ hasText: "Порядок оплаты" });
  await paymentSummary.click();
  const payment = page.getByRole("textbox", {
    name: "Порядок оплаты",
    exact: true,
  });
  const paymentBefore = await payment.inputValue();
  await payment.fill("");
  await paymentSummary.click();
  await page
    .getByRole("button", { name: "Сохранить шаблон", exact: true })
    .click();
  await expect(payment).toBeVisible();
  await expect(payment).toBeFocused();
  await payment.fill(paymentBefore);
  await page
    .getByRole("button", { name: "Сохранить шаблон", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Шаблон сохранён");
  await page.reload();
  await expect(page.getByLabel("ФИО или название организации")).toHaveValue(
    landlordName,
  );
  await page.getByLabel("ФИО или название организации").fill(landlordName);
  mkdirSync("output/screenshots", { recursive: true });
  await page.screenshot({
    path: "output/screenshots/template-editor.png",
    fullPage: true,
  });
  expect(await (await request.get("/apartments")).text()).not.toContain(
    landlordName,
  );
  expect(await (await request.get("/apartments")).text()).not.toContain(
    landlordDocument,
  );

  await page.goto("/properties");
  await page
    .getByRole("button", { name: "Добавить из каталога", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText(
    /Добавлено квартир|уже добавлены/,
  );
  const properties = await (await page.request.get("/api/properties")).json();
  const linked = properties.filter(
    (property: { catalogSlug: string | null }) => property.catalogSlug,
  );
  expect(linked).toHaveLength(7);
  const apartment = apartments[0];
  const property = linked.find(
    (entry: { catalogSlug: string }) => entry.catalogSlug === apartment.slug,
  );
  expect(property).toBeTruthy();
  restoreState.property = {
    id: property.id,
    input: Object.fromEntries(
      ["name", "address", "type", "unit", "description", "rent", "deposit"].map(
        (key) => [key, property[key]],
      ),
    ),
  };
  await page
    .getByRole("searchbox", { name: "Поиск по квартирам" })
    .fill(apartment.address);
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: property.name, exact: true }),
  });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Изменить", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Сумма аренды для договора, ₸").fill("48000");
  await editor
    .getByRole("button", { name: "Сохранить объект", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Объект обновлён");
  await page.getByRole("searchbox", { name: "Поиск по квартирам" }).clear();
  const coverImages = page.locator("article img");
  await expect(coverImages).toHaveCount(7);
  for (const image of await coverImages.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "output/screenshots/admin-properties-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("searchbox", { name: "Поиск по квартирам" })
    .fill(apartment.address);
  await expect(
    card.getByRole("img", { name: apartment.photos[0].alt, exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("link", { name: "Открыть 2ГИС", exact: true }),
  ).toHaveAttribute("href", apartment.mapUrl!);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/screenshots/admin-properties-mobile.png",
    fullPage: true,
  });
  await card
    .getByRole("link", { name: "Создать договор", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/contracts/new\\?propertyId=${property.id}$`),
  );
  await expect(page.getByLabel("Объект недвижимости")).toHaveValue(property.id);
  await expect(page.getByLabel("Аренда за весь срок, ₸")).toHaveValue("48000");
  await page
    .getByText("Реквизиты арендодателя", { exact: false })
    .first()
    .click();
  await expect(page.getByLabel("ФИО или название организации")).toHaveValue(
    landlordName,
  );
  await expect(page.getByLabel(/^Удостоверение личности, №/)).toHaveValue(
    landlordDocument,
  );
  await page
    .getByLabel("ФИО арендатора")
    .fill("ДЕМО • Проверочный арендатор шаблона");
  await page.getByLabel("Контактный телефон").first().fill("+7 000 000 00 00");
  await page
    .getByLabel("Удостоверение личности / паспорт, №")
    .fill("Проверочный паспорт арендатора");
  await page
    .getByLabel("Адрес проживания арендатора")
    .fill("Проверочный адрес арендатора");
  await page.getByLabel("Аренда за весь срок, ₸").fill("65000");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "output/screenshots/prepared-contract-form.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Предварительный просмотр", exact: true })
    .click();
  await expect(page.getByRole("article")).toContainText(landlordName);
  await expect(page.getByRole("article")).toContainText(landlordDocument);
  await expect(page.getByRole("article")).toContainText(additionalTerms);
  await expect(page.getByRole("article")).toContainText(
    "Проверочный паспорт арендатора",
  );
  await page
    .getByRole("button", { name: "Сохранить черновик", exact: true })
    .click();
  await expect(page).toHaveURL(/contracts\/[^/]+\?saved=1$/);
  const contractPath = new URL(page.url()).pathname;
  const contract = await (await page.request.get(`/api${contractPath}`)).json();
  const content = JSON.parse(contract.content);
  expect(content.landlordName).toBe(landlordName);
  expect(content.landlordDocument).toBe(landlordDocument);
  expect(content.tenantDocument).toBe("Проверочный паспорт арендатора");
  expect(content.additionalTerms).toBe(additionalTerms);
  expect(content.obligations).toContain("100 000");
  expect(content.obligations).toContain("23:00");
  expect(content.propertyId).toBe(property.id);
  expect(content.rent).toBe(65000);
  const pdf = await page.request.get(`/api${contractPath}/pdf`);
  expect(pdf.ok()).toBe(true);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  mkdirSync("output/pdf", { recursive: true });
  writeFileSync("output/pdf/prepared-admin-contract.pdf", await pdf.body());
});
