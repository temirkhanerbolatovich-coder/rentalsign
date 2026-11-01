import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";
import { defaultTerms } from "../src/domain/contracts";

const origin = "http://localhost:3100";

test("catalog pricing can be adjusted and issued contracts appear as private-safe calendar bookings", async ({
  page,
  request,
}) => {
  const apartment = apartments[0];
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
  const { id: propertyId } = await imported.json();
  await page.goto(`/contracts/new?propertyId=${propertyId}`);
  const rent = page.getByLabel("Аренда за весь срок, ₸");
  await expect(rent).toHaveValue("30000");
  await expect(page.getByText("Расчёт от нижней границы цены")).toBeVisible();
  await page.getByLabel("Скидка, ₸").fill("1");
  await expect(rent).toHaveValue("29999");
  await page.getByLabel("Скидка, ₸").fill("0");
  await expect(rent).toHaveValue("30000");
  await page.getByLabel("Дата и время заезда").fill("2090-12-01T14:00");
  await expect(page.getByLabel("Дата и время заезда")).toHaveValue(
    "2090-12-01T14:00",
  );
  await expect(rent).toHaveValue("0");
  await page.getByLabel("Дата и время выезда").fill("2090-12-03T15:00");
  await expect(page.getByLabel("Дата и время выезда")).toHaveValue(
    "2090-12-03T15:00",
  );
  await expect(rent).toHaveValue("90000");
  await page.getByLabel("Скидка, ₸").fill("90000");
  await expect(
    page.getByText("Скидка должна быть меньше рассчитанной суммы."),
  ).toBeVisible();
  await page.getByLabel("Скидка, ₸").fill("10000");
  await expect(rent).toHaveValue("80000");
  await page.getByLabel("Дата и время выезда").fill("2090-12-04T15:00");
  await expect(rent).toHaveValue("110000");
  await rent.fill("65000");
  await expect(page.getByLabel("Скидка, ₸")).toHaveValue("0");
  await page.getByLabel("Дата и время выезда").fill("2090-12-05T15:00");
  await expect(rent).toHaveValue("65000");
  await page
    .getByRole("button", { name: "Рассчитать заново по цене сайта" })
    .click();
  await expect(rent).toHaveValue("150000");
  const input = {
    propertyId,
    landlordName: "Тестовый владелец",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "Конфиденциальный тестовый гость",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2090-02-01T00:30:00+05:00",
    checkOut: "2090-02-04T12:00:00+05:00",
    rent: 65000,
    deposit: 0,
    additionalTerms: "",
    ...defaultTerms,
  };
  const response = await page.request.post("/api/contracts", {
    headers: { Origin: origin },
    data: input,
  });
  expect(response.ok()).toBe(true);
  const contract = await response.json();
  await page.goto(`/contracts/${contract.id}/edit`);
  await expect(page.getByLabel("Аренда за весь срок, ₸")).toHaveValue("65000");
  await page.getByLabel("Дата и время выезда").fill("2090-02-05T12:00");
  await expect(page.getByLabel("Аренда за весь срок, ₸")).toHaveValue("65000");
  const publicUrl = `/api/availability?apartment=${apartment.slug}`;
  const booking = {
    startDate: "2090-02-01",
    endDate: "2090-02-04",
    status: "reserved",
  };
  expect(await (await request.get(publicUrl)).json()).not.toContainEqual(
    booking,
  );
  const issued = await page.request.post(`/api/contracts/${contract.id}/link`, {
    headers: { Origin: origin },
    data: { ttlHours: 24, revision: contract.revision },
  });
  expect(issued.ok()).toBe(true);
  const { url } = await issued.json();
  let publicData = await (await request.get(publicUrl)).json();
  expect(publicData).toContainEqual(booking);
  const overlapping = await page.request.post("/api/contracts", {
    headers: { Origin: origin },
    data: input,
  });
  expect(overlapping.status()).toBe(409);
  expect((await overlapping.json()).error).toContain(
    "заняты или забронированы",
  );
  for (const item of publicData)
    expect(Object.keys(item).sort()).toEqual([
      "endDate",
      "startDate",
      "status",
    ]);
  expect(JSON.stringify(publicData)).not.toContain(input.tenantName);
  expect(JSON.stringify(publicData)).not.toContain(contract.id);
  await page.goto("/availability");
  await expect(
    page.getByRole("region", { name: "Брони по договорам" }),
  ).toContainText("2090-02-01 — 2090-02-04");
  await page
    .getByRole("combobox", { name: "Квартира", exact: true })
    .selectOption(apartment.slug);
  await page.getByLabel("Первый занятый день").fill("2090-02-02");
  await page
    .getByLabel("Последний занятый день (включительно)")
    .fill("2090-02-03");
  await page.getByRole("button", { name: "Добавить период" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "пересекается с бронью" }),
  ).toBeVisible();
  expect(
    await (await page.request.get("/api/availability")).json(),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Сохранить отметку" }).click();
  await expect(
    page.getByText("2090-02-02 — 2090-02-03 · Занято"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Снять отметку" }).click();
  await expect(page.getByText("2090-02-02 — 2090-02-03 · Занято")).toHaveCount(
    0,
  );
  expect(
    (
      await page.request.delete(`/api/contracts/${contract.id}/link`, {
        headers: { Origin: origin },
      })
    ).ok(),
  ).toBe(true);
  publicData = await (await request.get(publicUrl)).json();
  expect(publicData).not.toContainEqual(booking);
  const secondResponse = await page.request.post("/api/contracts", {
    headers: { Origin: origin },
    data: input,
  });
  const second = await secondResponse.json();
  const linkResponse = await page.request.post(
    `/api/contracts/${second.id}/link`,
    {
      headers: { Origin: origin },
      data: { ttlHours: 24, revision: second.revision },
    },
  );
  const token = (await linkResponse.json()).url.split("/").at(-1);
  expect(
    (
      await request.post(`/api/sign/${token}`, {
        headers: { Origin: origin },
        data: { acknowledged: true },
      })
    ).ok(),
  ).toBe(true);
  expect(await (await request.get(publicUrl)).json()).toContainEqual(booking);
  expect(
    (
      await request.post(`/api/contracts/${second.id}/booking-cancellation`, {
        headers: { Origin: origin },
        data: { reason: "Тест" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post(
        `/api/contracts/${second.id}/booking-cancellation`,
        {
          headers: { Origin: origin },
          data: { reason: " " },
        },
      )
    ).status(),
  ).toBe(400);
  await page.goto(`/contracts/${second.id}`);
  await page.getByLabel("Причина отмены брони").fill("Изменились планы гостя");
  await page.getByRole("button", { name: "Отменить бронь" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Отменить бронь" })
    .click();
  await expect(page.getByText("Бронь отменена", { exact: true })).toBeVisible();
  await expect(page.getByText("Изменились планы гостя")).toBeVisible();
  expect(
    (
      await page.request.post(
        `/api/contracts/${second.id}/booking-cancellation`,
        {
          headers: { Origin: origin },
          data: { reason: "Повтор" },
        },
      )
    ).status(),
  ).toBe(409);
  expect(await (await request.get(publicUrl)).json()).not.toContainEqual(
    booking,
  );
  await page.goto(`/sign/${token}`);
  await expect(
    page.getByText("Бронь отменена. Обратитесь к владельцу для уточнения."),
  ).toBeVisible();
  await expect(page.getByText("Изменились планы гостя")).toHaveCount(0);
  expect(url).toContain("/sign/");
});
