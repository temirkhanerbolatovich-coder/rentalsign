import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { apartments } from "../src/catalog/apartments";

const origin = "http://localhost:3100";
let cleanup: { endpoint: string; key: string } | undefined;

test.afterEach(async ({ page }) => {
  if (!cleanup) return;
  const result = await page.request.get(cleanup.endpoint);
  if (result.ok()) {
    const gallery = await result.json();
    if (
      gallery.photos.some(
        (photo: { key: string }) => photo.key === cleanup!.key,
      )
    ) {
      await page.request.patch(cleanup.endpoint, {
        headers: { Origin: origin },
        data: {
          revision: gallery.revision,
          action: "delete",
          key: cleanup.key,
        },
      });
    }
  }
  cleanup = undefined;
});

const credentials = (email: string) => ({
  email,
  password: process.env.E2E_PASSWORD!,
});

test("owner manages photos; public gallery follows the designated owner and private photos stay private", async ({
  page,
  browser,
  request,
}) => {
  const apartment = apartments.find(
    (item) => item.slug === "mihaelisa-8-2-35",
  )!;
  const image = await sharp({
    create: { width: 100, height: 80, channels: 3, background: "#8a5c40" },
  })
    .png()
    .toBuffer();
  const unknown = await request.post("/api/properties/no-such-id/photos", {
    headers: {
      Origin: origin,
      "Content-Type": "image/png",
      "X-Gallery-Revision": "0",
    },
    data: image,
  });
  expect(unknown.status()).toBe(401);
  expect(
    (
      await page.request.post("/api/auth/login", {
        headers: { Origin: origin },
        data: credentials("photos-owner@e2e.test"),
      })
    ).ok(),
  ).toBe(true);
  const created = await page.request.post(
    `/api/catalog/${apartment.slug}/property`,
    { headers: { Origin: origin } },
  );
  const { id } = await created.json();
  const endpoint = `/api/properties/${id}/photos`;
  expect(
    (
      await page.request.post(endpoint, {
        headers: {
          Origin: "https://evil.test",
          "Content-Type": "image/png",
          "X-Gallery-Revision": "0",
        },
        data: image,
      })
    ).status(),
  ).toBe(403);
  await page.goto("/properties");
  const card = page.getByRole("article").filter({ hasText: apartment.address });
  await card.getByRole("button", { name: "Управлять фото" }).click();
  const dialog = page.getByRole("dialog", { name: /Фотографии объекта/ });
  await expect(dialog).toContainText(
    "Изменения сразу видны в публичном каталоге",
  );
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: image });
  const index = apartment.photos.length + 1;
  await expect(
    dialog.getByRole("button", { name: `Сделать обложкой ${index}` }),
  ).toBeEnabled();
  await dialog
    .getByRole("button", { name: `Сделать обложкой ${index}` })
    .click();
  await expect(dialog.getByText("Обложка")).toHaveCount(1);
  const imageSrc = await dialog
    .locator('img[src*="/api/property-photos/"]')
    .first()
    .getAttribute("src");
  expect(imageSrc).toBeTruthy();
  const photoUrl = new URL(imageSrc!, origin).pathname;
  cleanup = { endpoint, key: photoUrl!.split("/").at(-1)! };
  await expect
    .poll(
      async () =>
        (await (await page.request.get(endpoint)).json()).photos[0].key,
    )
    .toBe(cleanup.key);
  await page.reload();
  await expect(card.locator(`img[src$="${photoUrl}"]`)).toBeVisible();
  const publicPage = await browser.newPage();
  await publicPage.goto(`/apartments/${apartment.slug}`);
  await expect(
    publicPage.getByText(`${index} фото`, { exact: true }),
  ).toBeVisible();
  await expect(
    publicPage.locator(`img[src$="${photoUrl}"]`).first(),
  ).toBeVisible();
  expect((await request.get(photoUrl!)).status()).toBe(200);
  const other = await browser.newContext();
  expect(
    (
      await other.request.post(`${origin}/api/auth/login`, {
        headers: { Origin: origin },
        data: credentials("photos-other@e2e.test"),
      })
    ).ok(),
  ).toBe(true);
  expect((await other.request.get(`${origin}${endpoint}`)).status()).toBe(404);
  const otherImport = await other.request.post(
    `${origin}/api/catalog/${apartment.slug}/property`,
    { headers: { Origin: origin } },
  );
  const otherId = (await otherImport.json()).id;
  const otherAdd = await other.request.post(
    `${origin}/api/properties/${otherId}/photos`,
    {
      headers: {
        Origin: origin,
        "Content-Type": "image/png",
        "X-Gallery-Revision": "0",
      },
      data: image,
    },
  );
  expect(otherAdd.ok()).toBe(true);
  const otherPhoto = (await otherAdd.json()).photos.at(-1).src;
  expect((await request.get(otherPhoto)).status()).toBe(404);
  expect((await other.request.get(`${origin}${otherPhoto}`)).status()).toBe(
    200,
  );
  await publicPage.reload();
  await expect(
    publicPage.locator(`img[src$="${photoUrl}"]`).first(),
  ).toBeVisible();
  await page.goto("/properties");
  await card.getByRole("button", { name: "Управлять фото" }).click();
  page.once("dialog", (confirm) => confirm.accept());
  await dialog
    .getByRole("button", { name: "Удалить фото 1", exact: true })
    .click();
  await expect
    .poll(async () => (await request.get(photoUrl!)).status())
    .toBe(404);
  await publicPage.reload();
  await expect(
    publicPage.getByText(`${apartment.photos.length} фото`, { exact: true }),
  ).toBeVisible();
  await other.close();
  await publicPage.close();
});
