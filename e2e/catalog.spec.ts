import { test, expect, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { apartments } from "../src/catalog/apartments";

const origin = "http://localhost:3100";

test("public catalog supports address search, price filters and sorting without exposing private objects", async ({
  page,
}) => {
  await page.goto("/apartments");
  await expect(
    page.getByRole("heading", { name: "Квартиры для аренды" }),
  ).toBeVisible();
  const catalog = page.getByRole("region", {
    name: "Каталог квартир",
    exact: true,
  });
  await expect(catalog.getByRole("article")).toHaveCount(apartments.length);
  await catalog.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      catalog
        .getByRole("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  mkdirSync("output/screenshots", { recursive: true });
  await page.screenshot({
    path: "output/screenshots/catalog-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByText("ДЕМО • Мобильный сценарий", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Поиск по адресу").fill("Базовая");
  await expect(catalog.getByRole("article")).toHaveCount(
    apartments.filter((apartment) => apartment.address.includes("Базовая"))
      .length,
  );
  await page.getByLabel("Поиск по адресу").fill("Нет такого адреса 999999");
  await expect(catalog.getByRole("article")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Квартиры не найдены" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).first().click();
  const priced = apartments.filter((apartment) => apartment.priceMin !== null);
  const minimumPrice = Math.min(
    ...priced.map((apartment) => apartment.priceMin!),
  );
  await page.getByLabel("Начальная цена не выше, ₸").fill(String(minimumPrice));
  await expect(catalog.getByRole("article")).toHaveCount(
    priced.filter((apartment) => apartment.priceMin! <= minimumPrice).length,
  );
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await page.getByLabel("Порядок квартир").selectOption("price-desc");
  const mostExpensive = [...priced].sort(
    (first, second) => second.priceMin! - first.priceMin!,
  )[0];
  await expect(
    catalog.getByRole("article").first().getByRole("heading"),
  ).toHaveText(mostExpensive.title);
  await page.getByLabel("Порядок квартир").selectOption("price-asc");
  const cheapest = [...priced].sort(
    (first, second) => first.priceMin! - second.priceMin!,
  )[0];
  await expect(
    catalog.getByRole("article").first().getByRole("heading"),
  ).toHaveText(cheapest.title);
  const missing = apartments.find((apartment) => apartment.priceMin === null)!;
  await expect(catalog.getByRole("article").last()).toContainText(
    missing.title,
  );
  await expect(catalog.getByRole("article").last()).toContainText(
    "Цена по запросу",
  );
  expect((await page.request.get("/api/properties")).status()).toBe(401);
  const unknown = await page.goto("/apartments/not-a-real-apartment");
  expect(unknown?.status()).toBe(404);
});

test("mobile apartment gallery shows real images, full screen controls and the supplied map link", async ({
  browser,
}) => {
  const apartment = apartments.find(
    (entry) => entry.mapUrl && entry.photos.length > 1,
  )!;
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    baseURL: origin,
  });
  const page = await context.newPage();
  await page.goto(`/apartments/${apartment.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    apartment.title,
  );
  const cover = page
    .getByRole("button", { name: "Открыть фото 1 на весь экран" })
    .getByRole("img");
  await expect(cover).toBeVisible();
  await expect
    .poll(() =>
      cover.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Следующее фото", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Открыть фото 2 на весь экран" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Открыть фото 2 на весь экран" })
    .click();
  const gallery = page.getByRole("dialog", { name: "Фотографии квартиры" });
  await expect(gallery).toBeVisible();
  await gallery
    .getByRole("button", { name: "Следующее фото", exact: true })
    .click();
  await gallery
    .getByRole("button", { name: "Предыдущее фото", exact: true })
    .click();
  await gallery.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(gallery).not.toBeVisible();
  const mapLink = page.getByRole("link").filter({ hasText: /2ГИС/ }).first();
  await expect(mapLink).toHaveAttribute("href", apartment.mapUrl!);
  await expect(mapLink).toHaveAttribute("rel", /noopener/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  mkdirSync("output/screenshots", { recursive: true });
  await page.screenshot({
    path: "output/screenshots/apartment-mobile.png",
    fullPage: true,
  });
  await context.close();
});

test("corrected apartment details expose the confirmed addresses, photo sets and arrival instructions", async ({
  page,
}) => {
  const confirmed = [
    {
      slug: "mihaelisa-8-69",
      unit: "69",
      entrance: 4,
      floor: 5,
      photos: 8,
      map: "https://2gis.kz/ustkam/geo/12807747095497019/82.611883,49.965678",
    },
    {
      slug: "mihaelisa-8-2-35",
      unit: "35",
      entrance: 2,
      floor: 4,
      photos: 21,
      map: "https://2gis.kz/ustkam/geo/12807747095497085/82.612469,49.966384",
    },
    {
      slug: "esenberlina-46-10",
      unit: "10",
      entrance: 1,
      floor: 4,
      photos: 7,
      map: "https://2gis.kz/ustkam/geo/70030076308891814/82.614717,49.916413",
    },
    {
      slug: "mihaelisa-7-240",
      unit: "240",
      entrance: 7,
      floor: 6,
      photos: 21,
      map: "https://2gis.kz/ustkam/geo/12807747095505295/82.608168,49.965321",
    },
  ];
  for (const apartment of confirmed) {
    await page.goto(`/apartments/${apartment.slug}`);
    await expect(
      page.getByText(`Квартира ${apartment.unit}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`Подъезд ${apartment.entrance}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`Этаж ${apartment.floor}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${apartment.photos} фото`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Открыть в 2ГИС (новая вкладка)",
        exact: true,
      }),
    ).toHaveAttribute("href", apartment.map);
    const cover = page
      .getByRole("button", {
        name: "Открыть фото 1 на весь экран",
        exact: true,
      })
      .getByRole("img");
    await expect
      .poll(() =>
        cover.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    if (apartment.unit === "10") {
      await page.locator("summary").filter({ hasText: "Вход и домофон" }).click();
      await expect(
        page.getByText(/10.*видеодомофон|видеодомофон.*10/i),
      ).toBeVisible();
    }
  }
});

test("owner handoff authenticates, imports once and requires an agreed period total", async ({
  page,
  request,
}) => {
  const apartment = apartments[0];
  const endpoint = `/api/catalog/${apartment.slug}/property`;
  expect(
    (await request.post(endpoint, { headers: { Origin: origin } })).status(),
  ).toBe(401);
  await page.goto(`/apartments/${apartment.slug}`);
  await page
    .getByRole("link", { name: "Подготовить договор", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/login\\?apartment=${apartment.slug}$`),
  );
  await page.getByLabel("Email администратора").fill("fictional@e2e.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/contracts/new\\?apartment=${apartment.slug}$`),
  );
  const importButton = page.getByRole("button", {
    name: "Добавить объект и продолжить",
    exact: true,
  });
  await expect(
    importButton.or(page.getByLabel("Объект недвижимости")),
  ).toBeVisible();
  // The isolated e2e database may already contain the linked property from an earlier run.
  if (await importButton.count()) await importButton.click();
  await expect(page.getByLabel("Объект недвижимости")).toHaveValue(/\S+/);
  const csrf = await page.request.post(endpoint, {
    headers: { Origin: "https://evil.test" },
  });
  expect(csrf.status()).toBe(403);
  expect(
    (
      await page.request.post("/api/catalog/unknown-apartment/property", {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(404);
  const first = await page.request.post(endpoint, {
    headers: { Origin: origin },
  });
  expect(first.ok()).toBe(true);
  const imported = await first.json();
  const repeated = await page.request.post(endpoint, {
    headers: { Origin: origin },
  });
  expect(repeated.ok()).toBe(true);
  expect((await repeated.json()).id).toBe(imported.id);
  const privateProperties = await (
    await page.request.get("/api/properties")
  ).json();
  expect(
    privateProperties.find(
      (property: { id: string }) => property.id === imported.id,
    ).rent,
  ).toBe(0);
  await expect(page.getByLabel("Объект недвижимости")).toHaveValue(imported.id);
  await expect(page.getByLabel("Аренда за весь срок, ₸")).toHaveValue("0");
  if (!(await page.getByLabel("ФИО или название организации").isVisible()))
    await page
      .locator("summary")
      .filter({ hasText: "Реквизиты арендодателя" })
      .click();
  await page
    .getByLabel("ФИО или название организации")
    .fill("ДЕМО • Арендодатель каталога UI");
  await page.getByLabel("ФИО арендатора").fill("ДЕМО • Арендатор каталога UI");
  await page.getByLabel("Контактный телефон").nth(0).fill("+7 000 000 00 00");
  await page.getByLabel("Контактный телефон").nth(1).fill("+7 000 000 00 00");
  await page.getByRole("button", { name: "Предварительный просмотр" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /стоимость|сумм/i }),
  ).toBeVisible();
  await page.getByLabel("Аренда за весь срок, ₸").fill("48000");
  await page.getByRole("button", { name: "Предварительный просмотр" }).click();
  await expect(page.getByRole("article")).toContainText(
    "ДЕМО • Арендатор каталога UI",
  );
  await page.getByRole("button", { name: "Сохранить черновик" }).click();
  await expect(page).toHaveURL(/contracts\/[^/]+\?saved=1$/);
  const contractPath = new URL(page.url()).pathname;
  const detail = await (await page.request.get(`/api${contractPath}`)).json();
  const snapshot = JSON.parse(detail.content);
  expect(snapshot.propertyId).toBe(imported.id);
  expect(snapshot.property.address).toBe(apartment.address);
  expect(snapshot.rent).toBe(48000);
  await page.goto(`/contracts/new?apartment=${apartment.slug}`);
  await expect(page.getByLabel("Объект недвижимости")).toHaveValue(imported.id);
  await expect(
    page.getByRole("button", {
      name: "Добавить объект и продолжить",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/catalog/import", {
        headers: { Origin: origin },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/properties");
  await expect(
    page.getByText(/10.*видеодомофон|видеодомофон.*10/i),
  ).toBeVisible();
});

test("untrusted apartment login parameter cannot redirect to an external site", async ({
  page,
}) => {
  await page.goto("/login?apartment=https%3A%2F%2Fevil.test%2F");
  await page.getByLabel("Email администратора").fill("fictional@e2e.test");
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(page).toHaveURL(`${origin}/dashboard`);
});
