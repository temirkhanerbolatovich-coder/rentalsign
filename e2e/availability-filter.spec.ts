import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";
import { defaultTerms } from "../src/domain/contracts";

const origin = "http://localhost:3100";

test("availability opens with every reservation and filters both booking types by property", async ({
  page,
}) => {
  const headers = { Origin: origin };
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers,
        data: {
          email: "availability-owner@e2e.test",
          password: process.env.E2E_PASSWORD!,
        },
      })
    ).ok(),
  ).toBe(true);
  const makeProperty = async (name: string) => {
    const response = await page.request.post("/api/properties", {
      headers,
      data: {
        name,
        address: "Вымышленная улица, 1",
        type: "APARTMENT",
        unit: "1",
        description: "",
        rent: 5000,
        deposit: 0,
      },
    });
    expect(response.ok()).toBe(true);
    return (await response.json()).id as string;
  };
  const first = await makeProperty("Тестовая квартира фильтра А");
  const second = await makeProperty("Тестовая квартира фильтра Б");
  for (const [propertyId, day] of [
    [first, "01"],
    [second, "10"],
  ]) {
    const created = await page.request.post("/api/contracts", {
      headers,
      data: {
        propertyId,
        landlordName: "Вымышленный владелец",
        landlordId: "",
        landlordPhone: "+7 000 000 00 00",
        tenantName: "Вымышленный гость",
        tenantId: "",
        tenantPhone: "+7 000 000 00 00",
        checkIn: `2098-03-${day}T14:00:00+05:00`,
        checkOut: `2098-03-${day}T20:00:00+05:00`,
        rent: 5000,
        deposit: 0,
        additionalTerms: "",
        ...defaultTerms,
      },
    });
    expect(created.ok()).toBe(true);
    const contract = await created.json();
    expect(
      (
        await page.request.post(`/api/contracts/${contract.id}/link`, {
          headers,
          data: { ttlHours: 24, revision: contract.revision },
        })
      ).ok(),
    ).toBe(true);
  }
  const imported = await page.request.post(
    `/api/catalog/${apartments[0].slug}/property`,
    { headers },
  );
  const catalogId = (await imported.json()).id as string;
  expect(
    (
      await page.request.post("/api/availability", {
        headers,
        data: {
          catalogSlug: apartments[0].slug,
          startDate: "2098-04-01",
          endDate: "2098-04-02",
          status: "reserved",
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/availability");
  const filter = page.getByLabel("Фильтр по квартире");
  const bookingList = page.getByRole("region", { name: "Брони по договорам" });
  await expect(filter).toHaveValue("");
  await expect(
    bookingList.getByText("Тестовая квартира фильтра А", { exact: true }),
  ).toBeVisible();
  await expect(
    bookingList.getByText("Тестовая квартира фильтра Б", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2098-04-01 — 2098-04-02 · Забронировано"),
  ).toBeVisible();
  await filter.selectOption(first);
  await expect(
    bookingList.getByText("Тестовая квартира фильтра А", { exact: true }),
  ).toBeVisible();
  await expect(
    bookingList.getByText("Тестовая квартира фильтра Б", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("2098-04-01 — 2098-04-02 · Забронировано"),
  ).toHaveCount(0);
  await filter.selectOption(second);
  await expect(
    bookingList.getByText("Тестовая квартира фильтра А", { exact: true }),
  ).toHaveCount(0);
  await expect(
    bookingList.getByText("Тестовая квартира фильтра Б", { exact: true }),
  ).toBeVisible();
  await filter.selectOption(catalogId);
  await expect(
    page.getByText("2098-04-01 — 2098-04-02 · Забронировано"),
  ).toBeVisible();
  await filter.selectOption("");
  await expect(
    bookingList.getByText("Тестовая квартира фильтра А", { exact: true }),
  ).toBeVisible();
  await expect(
    bookingList.getByText("Тестовая квартира фильтра Б", { exact: true }),
  ).toBeVisible();
});
