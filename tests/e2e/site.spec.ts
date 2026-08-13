import { expect, test } from "@playwright/test";

test("main navigation reaches every public section", async ({ page }) => {
  await page.goto("/");
  for (const path of ["/oferta/lato", "/oferta/zima", "/oferta/szkolenia", "/wydarzenia", "/rezerwacje", "/galeria", "/kontakt"]) {
    await expect(page.locator(`header a[href="${path}"]`)).toHaveCount(1);
  }
});

test("official TikTok is linked from the site", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="https://www.tiktok.com/@showteam_eu"]')).toHaveCount(3);
});

test("waterfront stays are published without invented pricing", async ({ page }) => {
  await page.goto("/oferta/noclegi-nad-woda");
  await expect(page.getByRole("heading", { name: "Noclegi nad wodą" })).toBeVisible();
  await expect(page.getByText("Kontenery mieszkalne")).toBeVisible();
  await expect(page.getByText("Domki holenderskie")).toBeVisible();
  await page.getByRole("button", { name: "Zdjęcia obiektów" }).click();
  await expect(page.getByText(/Zdjęcia kontenerów i domków dodamy po sesji/)).toBeVisible();
  await expect(page.getByText(/zł|PLN|cena/i)).toHaveCount(0);
});

test("customer can reserve an available equipment slot", async ({ page }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Test zapisuje rezerwację i działa wyłącznie na lokalnej bazie testowej.");
  await page.goto("/rezerwacje", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Sprzęt czeka/i })).toBeVisible();
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 14);
  const date = bookingDate.toISOString().slice(0, 10);
  const uniquePhone = `5${Date.now().toString().slice(-8)}`;
  await page.locator('input[type="date"]').fill(date);
  const firstSlot = page.locator("fieldset button").first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();
  await page.getByLabel("Imię i nazwisko").fill("Test Playwright");
  await page.getByLabel("Telefon").fill(uniquePhone);
  await page.getByRole("button", { name: "Rezerwuję termin" }).click();
  await expect(page.getByText("Rezerwacja zapisana")).toBeVisible();
  await expect(page.getByText(/^SHOW-/)).toBeVisible();
});

test("TV calendar requires one-time phone pairing", async ({ page }) => {
  await page.goto("/tv");
  await expect(page.getByRole("heading", { name: /Połącz telefon/i })).toBeVisible();
  await expect(page.locator("svg").filter({ has: page.locator("path") }).first()).toBeVisible();
  expect((await page.request.get("/api/calendar/events")).status()).toBe(401);
});

test("hero video stops on its last frame and restarts after leaving the viewport", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("section video").first();
  await expect(video).toBeVisible();
  expect(await video.getAttribute("loop")).toBeNull();
  await video.evaluate(async (element) => {
    const player = element as HTMLVideoElement;
    player.playbackRate = 8;
    await player.play();
  });
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).ended), { timeout: 5_000 }).toBe(true);
  await expect.poll(() => video.evaluate((element) => {
    const player = element as HTMLVideoElement;
    return Math.abs(player.duration - player.currentTime) < 0.15;
  })).toBe(true);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight + 200));
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime > 0)).toBe(true);
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

test("SEO and anonymous analytics endpoints are published", async ({ page }) => {
  await page.goto("/wydarzenia");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);
  expect((await page.request.get("/sitemap.xml")).ok()).toBe(true);
  expect((await page.request.get("/robots.txt")).ok()).toBe(true);
  expect((await page.request.post("/api/track", { data: { path: "/wydarzenia" } })).status()).toBe(204);
});

test("booking statistics stay private", async ({ request }) => {
  const response = await request.get("/api/admin/statistics");
  expect(response.status()).toBe(401);
});

test("quick uploader API is private and exposes an installable manifest", async ({ page }) => {
  const manifest = await page.request.get("/dodaj/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ start_url: "/dodaj", scope: "/" });
  expect((await page.request.post("/api/quick-upload", { multipart: { category: "Lato" } })).status()).toBe(401);
});

test("PWA dashboard links directly to common admin tasks", async ({ page }) => {
  await page.route("**/api/users/me", (route) => route.fulfill({ json: { user: { name: "Asia" } } }));
  await page.goto("/dodaj");
  await expect(page.getByRole("heading", { name: "Co chcesz zrobić?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Dodaj zdjęcia lub filmy/ })).toHaveAttribute("href", "/dodaj/galeria");
  await expect(page.getByRole("link", { name: /Dodaj wydarzenie/ })).toHaveAttribute("href", "/admin/collections/events/create");
  await expect(page.getByRole("link", { name: /Sprawdź rezerwacje/ })).toHaveAttribute("href", "/admin/kalendarz");
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

  test("reservations are usable without horizontal overflow", async ({ page }) => {
    await page.goto("/rezerwacje");
    await expect(page.getByRole("heading", { name: /Co bierzesz/i })).toBeVisible();
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
    for (let index = 0; index < await images.count(); index += 1) {
      await images.nth(index).scrollIntoViewIfNeeded();
      await expect.poll(() => images.nth(index).evaluate((image) => {
        const element = image as HTMLImageElement;
        return element.complete && element.naturalWidth > 0;
      })).toBe(true);
    }
  });

  test("PWA task dashboard fits a phone screen", async ({ page }) => {
    await page.route("**/api/users/me", (route) => route.fulfill({ json: { user: { name: "Asia" } } }));
    await page.goto("/dodaj");
    await expect(page.getByRole("heading", { name: "Co chcesz zrobić?" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });
});
