import { expect, test } from "@playwright/test";
import path from "node:path";

test("main navigation reaches every public section", async ({ page }) => {
  await page.goto("/");
  for (const path of ["/oferta/lato", "/oferta/zima", "/oferta/szkolenia", "/wydarzenia", "/aktualnosci", "/rezerwacje", "/galeria", "/kontakt", "/zgloszenie"]) {
    await expect(page.locator(`header a[href="${path}"]`)).toHaveCount(1);
  }
});

test("official TikTok is linked from the site", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="https://www.tiktok.com/@showteam1969"]')).toHaveCount(3);
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
  await page.route("**/api/reservations/availability?*", (route) => route.fulfill({ json: { slots: [{ time: "09:00", available: 1, recommendation: { recommended: true, level: "best", basis: "forecast", label: "Najlepszy warun", detail: "Prognoza: spokojna woda, wiatr 6 km/h." } }], durationMinutes: 60, windStatus: "forecast" } }));
  await page.route("**/api/reservations", (route) => route.fulfill({ status: 201, json: { reference: "SHOW-TEST1234", equipment: "SUP", date: "2026-08-27", time: "09:00", endTime: "10:00" } }));
  await page.goto("/rezerwacje", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Sprzęt czeka/i })).toBeVisible();
  await expect(page.getByText("Warun może się zmienić — to nie problem.")).toBeVisible();
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 14);
  const date = bookingDate.toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(date);
  const firstSlot = page.getByRole("group", { name: "Godzina" }).getByRole("button").first();
  await expect(firstSlot).toBeVisible();
  await expect(firstSlot).toContainText("Najlepszy warun");
  await firstSlot.click();
  await page.getByLabel("Imię i nazwisko").fill("Test Playwright");
  await page.getByLabel("Telefon").fill("500 128 090");
  await page.getByLabel("E-mail").fill("test@example.com");
  await page.getByRole("button", { name: "Rezerwuję termin" }).click();
  await expect(page.getByText("Rezerwacja zapisana")).toBeVisible();
  await expect(page.getByText(/^SHOW-/)).toBeVisible();
});

test("TV calendar requires one-time phone pairing", async ({ page }) => {
  await page.goto("/a/tv");
  await expect(page.getByRole("heading", { name: /Połącz telefon/i })).toBeVisible();
  await expect(page.locator("svg").filter({ has: page.locator("path") }).first()).toBeVisible();
  expect((await page.request.get("/api/calendar/events")).status()).toBe(401);
});

test("legacy staff pages redirect under /a", async ({ request }) => {
  for (const [oldPath, newPath] of [["/dodaj", "/a/dodaj"], ["/kalendarz", "/a/kalendarz"], ["/tv", "/a/tv"]]) {
    const response = await request.get(oldPath, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(newPath);
  }
});

test("hero video stops on its last frame and restarts after leaving the viewport", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("section video").first();
  await expect(video).toBeVisible();
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveAttribute("autoplay", "");
  await expect(video).toHaveAttribute("playsinline", "");
  expect(await video.getAttribute("controls")).toBeNull();
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
  await page.getByRole("button", { name: "Zima", exact: true }).click();
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

test("application administration and export stay private", async ({ request }) => {
  expect((await request.get("/api/admin/applications")).status()).toBe(401);
  expect((await request.get("/api/admin/applications/export")).status()).toBe(401);
});

test("availability block management stays private", async ({ request }) => {
  expect((await request.get("/api/admin/availability-blocks")).status()).toBe(401);
  expect((await request.post("/api/admin/availability-blocks", { data: {} })).status()).toBe(401);
});

test("rental hours management stays private", async ({ request }) => {
  expect((await request.get("/api/admin/availability-hours")).status()).toBe(401);
  expect((await request.post("/api/admin/availability-hours", { data: {} })).status()).toBe(401);
});

test("weather recommendation management stays private", async ({ request }) => {
  expect((await request.get("/api/admin/recommendations")).status()).toBe(401);
  expect((await request.put("/api/admin/recommendations", { data: {} })).status()).toBe(401);
});

test("reservation API requires an email address", async ({ request }) => {
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 14);
  const response = await request.post("/api/reservations", { data: { equipmentId: 1, date: bookingDate.toISOString().slice(0, 10), time: "09:00", name: "Test", phone: "500 128 090" } });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("e-mail");
});

test("Google Calendar management stays private and ICS is removed", async ({ request }) => {
  expect((await request.get("/api/admin/google-calendar/status")).status()).toBe(401);
  expect((await request.post("/api/admin/google-calendar/sync")).status()).toBe(401);
  expect((await request.get("/api/calendar/subscriptions")).status()).toBe(404);
});

test("CMS is the single installable staff dashboard", async ({ page }) => {
  const manifest = await page.request.get("/admin.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ id: "/admin", start_url: "/admin", scope: "/" });
  expect((await page.request.get("/a/dodaj")).status()).toBe(404);
  await page.goto("/admin/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/admin.webmanifest");
  expect((await page.request.post("/api/quick-upload", { multipart: { category: "Lato" } })).status()).toBe(401);
});

test("quick uploader previews the exact gallery crop", async ({ page }) => {
  await page.route("**/api/users/me", (route) => route.fulfill({ json: { user: { name: "Asia" } } }));
  await page.route("**/api/quick-upload", (route) => {
    const multipart = route.request().postDataBuffer()?.toString("latin1") || "";
    expect(multipart).toContain('name="small-0"');
    expect(multipart).toContain('name="medium-0"');
    expect(multipart.match(/Content-Type: image\/webp/g)).toHaveLength(3);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ count: 1 }) });
  });
  await page.goto("/a/dodaj/galeria");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "public/media/windsurf.jpg"));
  await expect(page.getByText("Kadr widoczny w galerii")).toBeVisible();
  await page.getByLabel(/Kadr poziomy/).fill("20");
  await page.getByLabel(/Kadr pionowy/).fill("80");
  await expect(page.getByAltText("Podgląd kadru")).toHaveCSS("object-position", "20% 80%");
  await page.getByRole("button", { name: "Opublikuj w galerii" }).click();
  await expect(page.getByText("Opublikowano 1 materiał.")).toBeVisible();
});

test("gallery opens a keyboard-accessible lightbox", async ({ page }) => {
  await page.goto("/galeria");
  await page.getByRole("button", { name: /Powiększ:/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Następne zdjęcie" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menu exposes gallery and layout does not overflow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu mobilne" });
    await expect(menu.getByRole("link")).toHaveCount(10);
    await expect(menu.getByRole("link", { name: /Zgłoszenie/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Galeria/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Aktualności/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "+48 500 128 090" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("menu uses client-side navigation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => Reflect.set(window, "__showteamNavigation", "alive"));
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByRole("navigation", { name: "Menu mobilne" }).getByRole("link", { name: /Galeria/ }).click();
    await expect(page).toHaveURL(/\/galeria$/);
    expect(await page.evaluate(() => Reflect.get(window, "__showteamNavigation"))).toBe("alive");
  });

  test("reservations are usable without horizontal overflow", async ({ page }) => {
    await page.goto("/rezerwacje");
    await expect(page.getByRole("heading", { name: /Co bierzesz/i })).toBeVisible();
    const dates = page.getByRole("group", { name: "Data" }).getByLabel("Najbliższe daty").getByRole("button");
    await expect(dates).toHaveCount(7);
    await dates.first().click();
    await expect(dates.first()).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Następny tydzień" }).click();
    await expect(page.getByRole("button", { name: "Poprzedni tydzień" })).toBeEnabled();
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

  test("installed PWA opens the mobile CMS", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("quick event form explains errors and can be cleared", async ({ page }) => {
    await page.route("**/api/users/me", (route) => route.fulfill({ json: { user: { name: "Asia" } } }));
    await page.goto("/a/dodaj/wydarzenie");
    await expect(page.getByRole("link", { name: "Wróć do panelu" })).toHaveAttribute("href", "/admin");
    await page.getByRole("button", { name: "Opublikuj wydarzenie" }).click();
    await expect(page.getByText("Wpisz nazwę wydarzenia.")).toBeVisible();
    await expect(page.getByText("Dodaj zdjęcie tego wydarzenia.")).toBeVisible();

    await page.getByLabel("Nazwa wydarzenia").fill("Testowe wydarzenie");
    await page.getByLabel("Miejsce").fill("Poręba");
    const preview = page.getByLabel("Podgląd wydarzenia");
    await expect(preview.getByRole("heading", { name: "Testowe wydarzenie" })).toBeVisible();
    await expect(preview.getByText("Poręba", { exact: true })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Wyczyść formularz" }).click();
    await expect(page.getByLabel("Nazwa wydarzenia")).toHaveValue("");
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("quick news form is clear and mobile-safe", async ({ page }) => {
    await page.route("**/api/users/me", (route) => route.fulfill({ json: { user: { name: "Asia" } } }));
    await page.goto("/a/dodaj/aktualnosc");
    await expect(page.getByRole("link", { name: "Wróć do panelu" })).toHaveAttribute("href", "/admin");
    await page.getByRole("button", { name: "Opublikuj aktualność" }).click();
    await expect(page.getByText("Wpisz tytuł aktualności.")).toBeVisible();
    await expect(page.getByText("Dodaj zdjęcie tej aktualności.")).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("participant application is clear and keeps its mobile layout", async ({ page }) => {
    await page.route("**/api/applications", (route) => route.fulfill({ status: 201, json: { reference: "ZGL-TEST1234" } }));
    await page.goto("/zgloszenie");
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await expect(page.getByText("Wybierz rodzaj wyjazdu.")).toBeVisible();
    await page.getByRole("button", { name: "Zima", exact: true }).click();
    await expect(page.getByLabel("Transport autokarem")).toBeVisible();
    await page.getByRole("button", { name: "Lato", exact: true }).click();
    await expect(page.getByLabel("Transport autokarem")).toHaveCount(0);
    await page.getByLabel("Następnie wybierz termin").selectOption({ index: 1 });
    await page.getByLabel("Imię").fill("Anna");
    await page.getByLabel("Nazwisko").fill("Testowa");
    await page.getByLabel("Data urodzenia").fill("2000-01-01");
    await page.getByLabel("Telefon opiekuna lub uczestnika").fill("500 128 090");
    await page.getByLabel("Adres zamieszkania i kod pocztowy").fill("Poręba, 43-200");
    await page.getByLabel("E-mail kontaktowy").fill("anna@example.com");
    await page.getByText("Wyrażam zgodę na przetwarzanie").click();
    await page.getByText("Potwierdzam poprawność danych").click();
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await expect(page.getByText(/ZGL-TEST1234/)).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("footer renders no limits as responsive text", async ({ page }) => {
    await page.goto("/kontakt");
    const slogan = page.getByText("no limits...");
    await slogan.scrollIntoViewIfNeeded();
    await expect(slogan).toBeVisible();
    const box = await slogan.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  });
});
