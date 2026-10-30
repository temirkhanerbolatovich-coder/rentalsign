import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";
const origin = "http://localhost:3100";
test("guest languages persist and calendar remains informational", async ({
  page,
}) => {
  await page.goto("/apartments");
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Жалға берілетін пәтерлер" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Жалға берілетін пәтерлер" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page
    .getByRole("link", { name: "View apartment", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Availability calendar" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Unmarked dates do not guarantee availability. Please confirm with the owner.",
    ),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".apartment-page-enter")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.screenshot({
    path: "output/screenshots/qutty-english-calendar.png",
    fullPage: true,
  });
});
test("availability enforces authentication, dates, ownership and public privacy", async ({
  page,
  request,
  browser,
}) => {
  const slug = apartments[0].slug;
  const payload = {
    catalogSlug: slug,
    startDate: "2026-11-03",
    endDate: "2026-11-05",
    status: "occupied",
  };
  expect(
    (
      await request.post("/api/availability", {
        headers: { Origin: origin },
        data: payload,
      })
    ).status(),
  ).toBe(401);
  await page.goto("/login");
  await page
    .getByLabel("Email администратора")
    .fill("availability-owner@e2e.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.request.post(`/api/catalog/${slug}/property`, {
    headers: { Origin: origin },
  });
  expect(
    (await page.request.post("/api/availability", { data: payload })).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/availability", {
        headers: { Origin: origin },
        data: { ...payload, startDate: "2026-02-30" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/availability", {
        headers: { Origin: origin },
        data: { ...payload, endDate: "2026-11-01" },
      })
    ).status(),
  ).toBe(400);
  const created = await page.request.post("/api/availability", {
    headers: { Origin: origin },
    data: payload,
  });
  expect(created.ok()).toBe(true);
  const { id } = await created.json();
  const publicResponse = await request.get(
    `/api/availability?apartment=${slug}`,
  );
  const rows = await publicResponse.json();
  expect(rows).toContainEqual({
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: "occupied",
  });
  expect(Object.keys(rows[0]).sort()).toEqual([
    "endDate",
    "startDate",
    "status",
  ]);
  const other = await browser.newContext();
  const login = await other.request.post(`${origin}/api/auth/login`, {
    headers: { Origin: origin },
    data: {
      email: "availability-other@e2e.test",
      password: process.env.E2E_PASSWORD!,
    },
  });
  expect(login.ok()).toBe(true);
  expect(
    (
      await other.request.delete(`${origin}/api/availability`, {
        headers: { Origin: origin },
        data: { id },
      })
    ).status(),
  ).toBe(404);
  await other.close();
  await page.goto("/availability");
  await expect(
    page.getByText("2026-11-03 — 2026-11-05 · Занято"),
  ).toBeVisible();
  expect(
    (
      await page.request.delete("/api/availability", {
        headers: { Origin: origin },
        data: { id },
      })
    ).ok(),
  ).toBe(true);
});

test("owner workspace uses selected language without translating contract contents", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await page
    .getByLabel("Administrator email")
    .fill("availability-other@e2e.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Workspace overview" }),
  ).toBeVisible();
  await page.goto("/availability");
  await expect(
    page.getByRole("heading", { name: "Apartment availability" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ҚАЗ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Пәтерлердің бос болмауы" }),
  ).toBeVisible();
});

test("English and Kazakh screens fit mobile and desktop", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByLabel("Email администратора")
    .fill("availability-other@e2e.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(page).toHaveURL(/dashboard/);
  for (const language of ["EN", "ҚАЗ"]) {
    await page.getByRole("button", { name: language, exact: true }).click();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        "/apartments",
        `/apartments/${apartments[0].slug}`,
        "/dashboard",
        "/contracts",
        "/contracts/new",
        "/properties",
        "/templates",
        "/availability",
      ]) {
        await page.goto(path);
        await expect(page.locator("main").first()).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          `${path} ${language} ${width}px`,
        ).toBe(false);
      }
    }
  }
});
