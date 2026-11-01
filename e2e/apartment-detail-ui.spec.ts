import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";

test("guest instructions are keyboard disclosures and owner handoff remains separate", async ({
  page,
}) => {
  const apartment = apartments.find(
    (item) => item.wifi && item.arrivalInstructions,
  )!;
  await page.goto(`/apartments/${apartment.slug}`);
  const wifi = page.locator("details").filter({
    has: page.locator("summary").filter({ hasText: "Wi-Fi для гостей" }),
  });
  await expect(wifi).not.toHaveAttribute("open", "");
  const network = wifi.getByText(apartment.wifi!.network, { exact: true });
  await expect(network).not.toBeVisible();
  await wifi.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(network).toBeVisible();
  await expect(
    wifi.getByText(apartment.wifi!.password, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(network).not.toBeVisible();
  const arrival = page.locator("details").filter({
    has: page.locator("summary").filter({ hasText: "Вход и домофон" }),
  });
  await arrival.locator("summary").click();
  await expect(
    arrival.getByText(apartment.arrivalInstructions!, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Для владельца квартиры", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Подготовить договор", exact: true }),
  ).toHaveAttribute("href", `/login?apartment=${apartment.slug}`);
  for (const [language, title] of [
    ["EN", "Entrance and intercom"],
    ["ҚАЗ", "Кіру және домофон"],
  ]) {
    await page.getByRole("button", { name: language, exact: true }).click();
    await expect(
      page.locator("summary").filter({ hasText: title }),
    ).toBeVisible();
  }
});

test("apartment page has no invented Wi-Fi and keeps key facts above gallery", async ({
  page,
}) => {
  const apartment = apartments.find((item) => !item.wifi)!;
  await page.goto(`/apartments/${apartment.slug}`);
  await expect(
    page.locator("summary").filter({ hasText: "Wi-Fi для гостей" }),
  ).toHaveCount(0);
  const header = page.locator("main header");
  await expect(header).toContainText(apartment.address);
  await expect(header).toContainText(`Этаж ${apartment.floor}`);
  await expect(header).toContainText("Стоимость аренды");
  const gallery = page.getByRole("region", { name: "Фотографии квартиры" });
  expect((await header.boundingBox())!.y).toBeLessThan(
    (await gallery.boundingBox())!.y,
  );
});

test("house rules are visible on each listing and follow the selected language", async ({
  page,
}) => {
  for (const apartment of apartments) {
    await page.goto(`/apartments/${apartment.slug}`);
    const rules = page.getByRole("region", { name: "Правила проживания" });
    await expect(rules).toBeVisible();
    await expect(rules.locator("li")).toHaveCount(15);
    await expect(rules).toContainText(
      "Заселение — с 14:00, выселение — до 11:00.",
    );
    await expect(rules).toContainText("штраф 100 000 тг");
  }
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("link", { name: /Home page/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /View on 2GIS map.*opens in a new tab/ }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "House rules" })).toContainText(
    "Check-in is from 14:00; checkout is by 11:00.",
  );
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Тұру ережелері" }),
  ).toContainText("Кіру — сағат 14:00-ден бастап, шығу — 11:00-ге дейін.");
});
