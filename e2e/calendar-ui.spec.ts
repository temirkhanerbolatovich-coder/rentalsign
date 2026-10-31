import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";

const path = `/apartments/${apartments[0].slug}`;

test("calendar marks Kazakhstan today and statuses without relying on color", async ({
  page,
}) => {
  // UTC is still October; the property timezone has already reached November.
  await page.clock.setFixedTime(new Date("2026-10-31T20:15:00Z"));
  await page.route("**/api/availability?apartment=*", (route) =>
    route.fulfill({
      json: [
        { startDate: "2026-11-01", endDate: "2026-11-02", status: "occupied" },
        { startDate: "2026-11-03", endDate: "2026-11-04", status: "reserved" },
      ],
    }),
  );
  await page.goto(path);
  const calendar = page.getByRole("region", { name: "Календарь занятости" });
  const today = calendar.locator('[aria-current="date"]');
  await expect(today).toHaveAttribute(
    "aria-label",
    /^1 ноября 2026.*Занято.*Сегодня/,
  );
  await expect(today).toContainText("×");
  await expect(
    calendar.getByRole("cell", { name: /^3 ноября 2026.*Забронировано/ }),
  ).toContainText("◇");
  await expect(
    calendar.getByRole("cell", { name: /^5 ноября 2026.*Нет отметки/ }),
  ).toContainText("—");
  await expect(
    calendar.getByText(
      "Неотмеченные даты не гарантируют доступность. Уточняйте у владельца.",
    ),
  ).toBeVisible();

  const next = calendar.getByRole("button", { name: "Следующий месяц" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(calendar.getByRole("table")).toHaveAttribute(
    "aria-label",
    /декабрь 2026/,
  );
  await expect(today).toHaveCount(0);
  await calendar.getByRole("button", { name: "Предыдущий месяц" }).focus();
  await page.keyboard.press("Enter");
  await expect(today).toHaveCount(1);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Availability calendar" })
      .getByRole("cell", { name: /^1 November 2026.*Occupied.*Today/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  const kazakhCalendar = page.getByRole("region", {
    name: "Қолжетімділік күнтізбесі",
  });
  await expect(kazakhCalendar.getByRole("table")).toHaveAttribute(
    "aria-label",
    "қараша 2026",
  );
  await expect(
    kazakhCalendar.getByRole("columnheader", { name: "Дс", exact: true }),
  ).toBeVisible();
  await expect(
    kazakhCalendar.getByRole("cell", {
      name: /^1 қараша 2026.*Бос емес.*Бүгін/,
    }),
  ).toBeVisible();
});

test("calendar loading and failure never display unmarked days as availability", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/availability?apartment=*", async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: { error: "Unavailable" } });
  });
  await page.goto(path);
  const calendar = page.getByRole("region", { name: "Календарь занятости" });
  await expect(
    calendar.getByRole("status", { name: "Загрузка календаря" }),
  ).toBeVisible();
  await expect(calendar.getByRole("table")).toHaveCount(0);
  release();
  await expect(calendar.getByRole("alert")).toHaveText(
    "Не удалось загрузить календарь",
  );
  await expect(calendar.getByRole("table")).toHaveCount(0);
  await expect(calendar.getByText("Нет отметки", { exact: true })).toHaveCount(
    0,
  );
});
