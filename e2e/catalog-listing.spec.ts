import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";
import { defaultTerms } from "../src/domain/contracts";

const origin = "http://localhost:3100";

test("owner edits the public listing and new agreements use the updated price and address", async ({
  page,
  browser,
}) => {
  const apartment = apartments[apartments.length - 1];
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: origin },
        data: {
          email: "photos-owner@e2e.test",
          password: process.env.E2E_PASSWORD!,
        },
      })
    ).ok(),
  ).toBe(true);
  const imported = await page.request.post(
    `/api/catalog/${apartment.slug}/property`,
    { headers: { Origin: origin } },
  );
  const { id } = await imported.json();
  const contract = await page.request.post("/api/contracts", {
    headers: { Origin: origin },
    data: {
      propertyId: id,
      landlordName: "Тестовый владелец",
      landlordId: "",
      landlordPhone: "+7 000 000 00 00",
      tenantName: "Тестовый гость",
      tenantId: "",
      tenantPhone: "+7 000 000 00 00",
      checkIn: "2095-01-01T14:00:00+05:00",
      checkOut: "2095-01-02T11:00:00+05:00",
      rent: 10000,
      deposit: 0,
      additionalTerms: "",
      ...defaultTerms,
    },
  });
  expect(contract.ok()).toBe(true);
  const { id: contractId } = await contract.json();
  const before = await (
    await page.request.get(`/api/contracts/${contractId}`)
  ).json();
  const anonymous = await browser.newContext({ baseURL: origin });
  try {
    expect(
      (
        await anonymous.request.put(`/api/properties/${id}/listing`, {
          headers: { Origin: origin },
          data: {},
        })
      ).status(),
    ).toBe(401);
    await page.goto("/properties");
    const card = page
      .getByRole("article")
      .filter({ hasText: apartment.address });
    await card
      .getByRole("button", { name: "Редактировать карточку сайта" })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Карточка квартиры на сайте",
    });
    await dialog
      .getByLabel("Название на сайте")
      .fill("Тестовое название квартиры");
    await dialog
      .getByLabel("Адрес", { exact: true })
      .fill("Тестовая улица, 123");
    await dialog
      .getByLabel("Описание квартиры")
      .fill("Тестовое описание квартиры");
    await dialog
      .getByLabel("Инструкции для гостей")
      .fill("Тестовая инструкция для гостей");
    await dialog
      .getByLabel("Ссылка на карту 2ГИС")
      .fill("https://2gis.kz/test");
    await dialog.getByLabel("Цена от, ₸ за сутки").fill("18000");
    await dialog.getByLabel("Цена до, ₸ за сутки").fill("21000");
    await dialog.getByRole("button", { name: "Сохранить карточку" }).click();
    await expect(dialog).toBeHidden();
    const guest = await anonymous.newPage();
    await guest.goto(`/apartments/${apartment.slug}`);
    await expect(
      guest.getByRole("heading", { name: "Тестовое название квартиры" }),
    ).toBeVisible();
    await expect(guest.getByText("Тестовая улица, 123")).toBeVisible();
    await expect(guest.getByText("Тестовое описание квартиры")).toBeVisible();
    await expect(guest.getByText(/18\s*000–21\s*000/).first()).toBeVisible();
    await guest.getByText("Вход и домофон").click();
    await expect(
      guest.getByText("Тестовая инструкция для гостей"),
    ).toBeVisible();
    await page.goto(`/contracts/new?propertyId=${id}`);
    await expect(page.getByLabel("Аренда за весь срок, ₸")).toHaveValue(
      "18000",
    );
    await expect(page.getByText("Тестовая улица, 123").first()).toBeVisible();
    const after = await (
      await page.request.get(`/api/contracts/${contractId}`)
    ).json();
    expect(after.content).toBe(before.content);
  } finally {
    await page.request.put(`/api/properties/${id}/listing`, {
      headers: { Origin: origin },
      data: {
        revision: 1,
        title: apartment.title,
        address: apartment.address,
        description: apartment.description,
        arrivalInstructions: apartment.arrivalInstructions,
        mapUrl: apartment.mapUrl,
        priceMin: apartment.priceMin,
        priceMax: apartment.priceMax,
      },
    });
    await anonymous.close();
  }
});
