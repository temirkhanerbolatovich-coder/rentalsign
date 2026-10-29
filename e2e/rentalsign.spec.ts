import { test, expect, devices } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
test("admin -> property -> preview -> personal link -> mobile demo signing -> PDF -> admin status", async ({
  page,
  browser,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email администратора").fill("fictional@e2e.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/properties");
  await page
    .getByRole("button", { name: "Добавить объект", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Название объекта").fill("ДЕМО • Мобильный сценарий");
  await dialog
    .getByLabel("Адрес", { exact: true })
    .fill("Вымышленный город, Тестовая улица, 2");
  await dialog.getByLabel("Сумма аренды для договора, ₸").fill("30000");
  await dialog.getByLabel("Депозит, ₸").fill("15000");
  await dialog.getByRole("button", { name: "Сохранить объект" }).click();
  await expect(page.getByRole("status")).toHaveText("Объект создан");
  await page.goto("/contracts/new");
  await page
    .getByLabel("Объект недвижимости")
    .selectOption({ label: "ДЕМО • Мобильный сценарий" });
  if (!(await page.getByLabel("ФИО или название организации").isVisible()))
    await page
      .locator("summary")
      .filter({ hasText: "Реквизиты арендодателя" })
      .click();
  await page
    .getByLabel("ФИО или название организации")
    .fill("ДЕМО • Арендодатель UI");
  await page.getByLabel("ФИО арендатора").fill("ДЕМО • Арендатор UI");
  await page.getByLabel("Контактный телефон").nth(0).fill("+7 000 000 00 00");
  await page.getByLabel("Контактный телефон").nth(1).fill("+7 000 000 00 00");
  await page.getByRole("button", { name: "Предварительный просмотр" }).click();
  await expect(page.getByRole("article")).toContainText("ДЕМО • Арендатор UI");
  await page.getByRole("button", { name: "Сохранить черновик" }).click();
  await expect(page).toHaveURL(/contracts\/[^/]+\?saved=1/);
  await page.getByRole("button", { name: "Сформировать ссылку" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Создать ссылку", exact: true })
    .click();
  const url = await page
    .getByLabel("Персональная ссылка", { exact: true })
    .inputValue();
  expect(url).toMatch(/^http:\/\/localhost:3100\/sign\/[A-Za-z0-9_-]{43}$/);
  const wa = new URL(
    (await page
      .getByRole("link", { name: "Отправить в WhatsApp" })
      .getAttribute("href"))!,
  );
  expect(wa.searchParams.get("text")).toContain(url);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Копировать ссылку", exact: true })
    .click();
  await expect(page.getByRole("status").last()).toHaveText(
    "Ссылка скопирована",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  mkdirSync("output/screenshots", { recursive: true });
  await page.screenshot({
    path: "output/screenshots/contract-desktop.png",
    fullPage: true,
  });
  const mobileContext = await browser.newContext(devices["iPhone 13"]);
  const mobile = await mobileContext.newPage();
  await mobile.goto(url);
  await expect(
    mobile.getByText("Настоящая ЭЦП не используется", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    mobile.getByRole("button", {
      name: "Демонстрационное подписание",
      exact: true,
    }),
  ).toBeDisabled();
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const preview = await mobile.request.get(
    url.replace("/sign/", "/api/sign/") + "/pdf",
  );
  expect(preview.status()).toBe(200);
  expect(preview.headers()["content-type"]).toBe("application/pdf");
  await mobile.getByRole("checkbox").check();
  await mobile
    .getByRole("button", { name: "Демонстрационное подписание", exact: true })
    .click();
  await mobile
    .getByRole("dialog")
    .getByRole("button", { name: "Демонстрационное подписание", exact: true })
    .click();
  await expect(
    mobile.getByRole("heading", { name: "Демонстрация завершена" }),
  ).toBeVisible();
  await expect(
    mobile.getByRole("button", {
      name: "Демонстрационное подписание",
      exact: true,
    }),
  ).toHaveCount(0);
  const [download] = await Promise.all([
    mobile.waitForEvent("download"),
    mobile.getByRole("link", { name: "Скачать итоговый демо PDF" }).click(),
  ]);
  await download.saveAs("output/pdf/mobile-browser-demo.pdf");
  expect(readFileSync("output/pdf/mobile-browser-demo.pdf").subarray(0, 5).toString()).toBe("%PDF-");
  await mobile.screenshot({
    path: "output/screenshots/signed-iphone.png",
    fullPage: true,
  });
  const pdf = await mobile.request.get(
    url.replace("/sign/", "/api/sign/") + "/pdf",
  );
  expect(pdf.status()).toBe(200);
  writeFileSync("output/pdf/mobile-final-demo.pdf", await pdf.body());
  const repeated = await mobile.request.post(
    url.replace("/sign/", "/api/sign/"),
    {
      data: { acknowledged: true },
      headers: { Origin: "http://localhost:3100" },
    },
  );
  expect(repeated.status()).toBe(409);
  await mobileContext.close();
  const androidContext = await browser.newContext(devices["Pixel 7"]);
  const android = await androidContext.newPage();
  await android.goto(url);
  await expect(
    android.getByRole("heading", { name: "Демонстрация завершена" }),
  ).toBeVisible();
  expect(
    await android.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await android.screenshot({
    path: "output/screenshots/signed-android.png",
    fullPage: true,
  });
  await androidContext.close();
  await page.reload();
  await expect(
    page.getByText("Подписан в демо", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Клиент выполнил демоподписание")).toBeVisible();
  const path = new URL(page.url()).pathname;
  const detail = await (await page.request.get("/api" + path)).json();
  const content = JSON.parse(detail.content);
  delete content.number;
  delete content.createdAt;
  delete content.property;
  const locked = await page.request.patch("/api" + path, {
    data: { content, revision: detail.revision },
    headers: { Origin: "http://localhost:3100" },
  });
  expect(locked.status()).toBe(409);
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/contracts");
    const row = page.getByRole("row").filter({ hasText: "ДЕМО • Арендатор UI" });
    await expect(row).toContainText("ДЕМО • Мобильный сценарий");
    await expect(row.getByRole("link", { name: /Скачать PDF/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `contracts at ${width}px`).toBe(true);
  }
  await page.goto("/dashboard");
  await page.screenshot({
    path: "output/screenshots/dashboard.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Объекты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Объекты недвижимости" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/screenshots/properties-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Выйти", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get("/api/contracts")).status()).toBe(401);
});
test("anonymous APIs, invalid links, login CSRF and input errors fail safely", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/properties")).status()).toBe(401);
  expect((await request.get("/api/contracts/1/pdf")).status()).toBe(401);
  expect((await request.get("/api/sign/1")).status()).toBe(404);
  expect((await request.get("/api/sign/" + "x".repeat(43))).status()).toBe(404);
  const csrf = await request.post("/api/auth/login", {
    data: { email: "fictional@e2e.test", password: process.env.E2E_PASSWORD! },
    headers: { Origin: "https://evil.test" },
  });
  expect(csrf.status()).toBe(403);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.goto("/sign/1");
  await expect(
    page.getByRole("heading", { name: "Ссылка недоступна" }),
  ).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Email администратора").fill("fictional@e2e.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("incorrect-fictional-password");
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Неверный email или пароль" }),
  ).toBeVisible();
});
