import { expect, test } from "@playwright/test";

test("main navigation reaches every public section", async ({ page }) => {
  await page.goto("/");
  for (const path of ["/oferta/lato", "/oferta/zima", "/oferta/szkolenia", "/galeria", "/kontakt"]) {
    await expect(page.locator(`header a[href="${path}"]`)).toHaveCount(1);
  }
});

test("gallery filters CMS photos", async ({ page }) => {
  await page.goto("/galeria");
  await expect(page.getByRole("heading", { name: /Galeria SHOWteam/i })).toBeVisible();
  const allCount = await page.locator("figure").count();
  expect(allCount).toBeGreaterThan(6);
  await page.getByRole("button", { name: "Zima" }).click();
  const winterCount = await page.locator("figure").count();
  expect(winterCount).toBeGreaterThan(0);
  expect(winterCount).toBeLessThan(allCount);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menu exposes gallery and layout does not overflow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await expect(page.getByRole("link", { name: /Galeria/ })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("gallery images load and retain varied proportions", async ({ page }) => {
    await page.goto("/galeria");
    const figures = page.locator("figure");
    const images = figures.locator("img");
    await expect(images.first()).toBeVisible();
    const state = await images.evaluateAll((nodes) => nodes.map((image) => {
      const element = image as HTMLImageElement;
      const box = element.getBoundingClientRect();
      return { loaded: element.complete && element.naturalWidth > 0, height: box.height, ratio: Math.round((box.width / box.height) * 100) };
    }));
    expect(state.every((image) => image.height > 180)).toBe(true);
    expect(new Set(state.map((image) => image.ratio)).size).toBeGreaterThan(1);
    for (let index = 0; index < await figures.count(); index += 1) {
      await figures.nth(index).scrollIntoViewIfNeeded();
      await expect.poll(() => images.nth(index).evaluate((image) => {
        const element = image as HTMLImageElement;
        return element.complete && element.naturalWidth > 0;
      })).toBe(true);
    }
  });
});
