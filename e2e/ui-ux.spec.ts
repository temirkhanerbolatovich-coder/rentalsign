import { test, expect } from "@playwright/test";
import { apartments } from "../src/catalog/apartments";

test("navigation light follows focus and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apartments");
  const nav = page.getByRole("navigation", { name: "Главная навигация" });
  const catalog = nav.getByRole("link", { name: "Каталог квартир" });
  const owner = nav.getByRole("link", { name: "Вход для владельца" });
  const light = nav.locator(".navigation-light");
  await expect(catalog).toHaveAttribute("aria-current", "page");
  await catalog.focus();
  await page.keyboard.press("Tab");
  await expect(owner).toBeFocused();
  await expect.poll(async () => {
    const lightBox = await light.boundingBox();
    const ownerBox = await owner.boundingBox();
    return Math.abs(lightBox!.x - ownerBox!.x);
  }).toBeLessThan(1);
  await expect(catalog).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Tab");
  await expect.poll(async () => {
    const lightBox = await light.boundingBox();
    const catalogBox = await catalog.boundingBox();
    return Math.abs(lightBox!.x - catalogBox!.x);
  }).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(light).toHaveCSS("transition-duration", "0s");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("animation-name", "none");
  await page.screenshot({ path: "output/screenshots/light-navigation-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "output/screenshots/light-navigation-desktop.png", fullPage: true });
});

test("catalog filters survive opening an apartment and returning", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apartments");
  await page.getByLabel("Поиск по адресу").fill("Базовая");
  await page.getByLabel("Начальная цена не выше, ₸").fill("45000");
  await page.getByLabel("Порядок квартир").selectOption("price-desc");
  const first = page.getByRole("region", { name: "Каталог квартир" }).getByRole("article").first();
  await first.getByRole("link", { name: "Подробнее" }).click();
  await expect(page).toHaveURL(/\/apartments\/[^/]+$/);
  await page.goBack();
  await expect(page.getByLabel("Поиск по адресу")).toHaveValue("Базовая");
  await expect(page.getByLabel("Начальная цена не выше, ₸")).toHaveValue("45000");
  await expect(page.getByLabel("Порядок квартир")).toHaveValue("price-desc");
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(page.getByRole("region", { name: "Каталог квартир" }).getByRole("article")).toHaveCount(apartments.length);
});

test("gallery keyboard and missing image states remain usable", async ({ page }) => {
  await page.goto(`/apartments/${apartments[0].slug}`);
  const trigger = page.getByRole("button", { name: "Открыть фото 1 на весь экран" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Фотографии квартиры" });
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("Фото 2 из", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Открыть фото 2 на весь экран" })).toBeFocused();
  await page.getByRole("region", { name: "Фотографии квартиры" }).evaluate((element) => {
    const start = new Touch({ identifier: 1, target: element, clientX: 280, clientY: 100 });
    const end = new Touch({ identifier: 1, target: element, clientX: 100, clientY: 100 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, changedTouches: [start] }));
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }));
  });
  await expect(page.getByRole("button", { name: "Открыть фото 3 на весь экран" })).toBeVisible();
  await page.route("**/_next/image?**", (route) => route.fulfill({ status: 404, body: "" }));
  await page.reload();
  await expect(page.getByText("Не удалось загрузить фотографию").first()).toBeVisible();
});

test("all apartment galleries show their original photos in order", async ({ page }) => {
  test.setTimeout(120000);
  for (const apartment of apartments) {
    await page.goto(`/apartments/${apartment.slug}`);
    for (let index = 0; index < apartment.photos.length; index++) {
      const image = page.getByRole("button", { name: `Открыть фото ${index + 1} на весь экран` }).getByRole("img");
      await expect(image).toHaveAttribute("alt", apartment.photos[index].alt);
      await expect.poll(() => image.evaluate((item) => (item as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      if (index + 1 < apartment.photos.length) await page.getByRole("button", { name: "Следующее фото", exact: true }).click();
    }
  }
});

test("public and owner screens fit the specified widths", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email администратора").fill("ui-layout@e2e.test");
  await page.getByLabel("Пароль", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Войти в аккаунт" }).click();
  await expect(page).toHaveURL(/dashboard/);
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/apartments", `/apartments/${apartments[0].slug}`, "/dashboard", "/contracts", "/properties", "/templates", "/contracts/new"]) {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const overflowing = overflow ? await page.locator("main *").evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().right > innerWidth).slice(0, 8).map((element) => ({ tag: element.tagName, class: element.className, width: element.getBoundingClientRect().width }))) : [];
      expect(overflow, `${path} at ${width}px ${JSON.stringify(overflowing)}`).toBe(false);
    }
  }
});
