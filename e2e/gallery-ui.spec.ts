import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";

const apartment = apartments[0];

test("desktop gallery previews select photos without changing their order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/apartments/${apartment.slug}`);
  const gallery = page.getByRole("region", {
    name: "Фотографии квартиры",
    exact: true,
  });
  const preview = gallery.getByRole("button", {
    name: "Выбрать фото 2",
    exact: true,
  });
  await expect(preview).toBeVisible();
  await preview.click();
  await expect(
    gallery.getByRole("button", { name: "Показать фото 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const mainPhoto = gallery.getByRole("button", {
    name: "Открыть фото 2 на весь экран",
    exact: true,
  });
  await expect(mainPhoto.getByRole("img")).toHaveAttribute(
    "alt",
    apartment.photos[1].alt,
  );
  await expect(
    gallery.getByRole("button", { name: "Выбрать фото 3", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    gallery.getByRole("button", { name: "Выбрать фото 3", exact: true }),
  ).toBeHidden();
  await expect(mainPhoto).toBeVisible();
});

test("delayed photos reserve their layout until the image loads", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/image?**", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto(`/apartments/${apartment.slug}`, {
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(() => document.fonts.ready);
    const mainPhoto = page.getByRole("button", {
      name: "Открыть фото 1 на весь экран",
      exact: true,
    });
    await expect(mainPhoto).toBeVisible();
    const placeholder = mainPhoto.locator(':scope > span[aria-hidden="true"]');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveCSS("animation-name", "none");
    await expect(mainPhoto.getByRole("img")).toHaveCSS("transition-property", "none");
    const before = await mainPhoto.boundingBox();
    expect(before).not.toBeNull();
    expect(before!.height).toBeGreaterThan(200);
    await expect(mainPhoto.getByRole("img")).toHaveCSS("opacity", "0");
    release();
    await expect
      .poll(() =>
        mainPhoto
          .getByRole("img")
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(placeholder).toHaveCount(0);
    const after = await mainPhoto.boundingBox();
    expect(Math.abs(before!.width - after!.width)).toBeLessThan(1);
    expect(Math.abs(before!.height - after!.height)).toBeLessThan(1);
  } finally {
    release();
  }
});

test("failed gallery photos leave navigation and full-screen controls usable", async ({
  page,
}) => {
  await page.route("**/_next/image?**", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto(`/apartments/${apartment.slug}`);
  const gallery = page.getByRole("region", {
    name: "Фотографии квартиры",
    exact: true,
  });
  const firstPhoto = gallery.getByRole("button", {
    name: "Открыть фото 1 на весь экран",
    exact: true,
  });
  await expect(
    firstPhoto.getByText("Не удалось загрузить фотографию", { exact: true }),
  ).toBeVisible();
  await gallery
    .getByRole("button", { name: "Следующее фото", exact: true })
    .click();
  const secondPhoto = gallery.getByRole("button", {
    name: "Открыть фото 2 на весь экран",
    exact: true,
  });
  await expect(secondPhoto).toBeVisible();
  await expect(
    secondPhoto.getByText("Не удалось загрузить фотографию", { exact: true }),
  ).toBeVisible();
  await secondPhoto.click();
  const dialog = page.getByRole("dialog", {
    name: "Фотографии квартиры",
    exact: true,
  });
  await expect(
    dialog.getByRole("button", { name: "Следующее фото", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(secondPhoto).toBeFocused();
});
