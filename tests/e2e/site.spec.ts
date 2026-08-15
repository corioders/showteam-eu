import { expect, test } from "@playwright/test";
import path from "node:path";

test("main navigation reaches every public section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('header img[src="/media/showteam-logo.svg"]')).toBeVisible();
  for (const path of ["/oferta/lato", "/oferta/zima", "/oferta/szkolenia", "/oferta/noclegi-nad-woda", "/rezerwacje", "/galeria", "/kontakt", "/zgloszenie"]) {
    await expect(page.locator(`header a[href="${path}"]`)).toHaveCount(1);
  }
  const locations = page.getByRole("navigation", { name: "Lokalizacje SHOWteam" }).getByRole("link");
  await expect(locations).toHaveCount(3);
  expect(await locations.evaluateAll((links) => links.every((link) => link.getAttribute("target") === "_blank"))).toBe(true);
});

test("contact page also introduces SHOWteam", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page).toHaveTitle(/Kontakt i o nas/);
  await expect(page.getByRole("heading", { name: /Asia, Adam i SHOWteam/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Wake & Surf Village/i })).toHaveAttribute("href", /google\.com\/maps\/place\/SHOWteam\+WAKE\+%26\+SURF\+Village/);
});

test("offer pages lead directly to a preselected application", async ({ page }) => {
  for (const [path, offer] of [["/oferta/lato", "SHOWlato 2026"], ["/oferta/zima", "SHOWzima 2026"], ["/oferta/szkolenia", "Patent i progres"]]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Wyślij zgłoszenie" })).toHaveAttribute("href", `/zgloszenie?oferta=${encodeURIComponent(offer)}`);
  }
});

test("offer pages open their locations in Google Maps", async ({ page }) => {
  for (const [path, count] of [["/oferta/lato", 1], ["/oferta/szkolenia", 1], ["/oferta/zima", 2]] as const) {
    await page.goto(path);
    const mapLinks = page.locator('section[aria-label="Dojazd"] a[target="_blank"]');
    await expect(mapLinks).toHaveCount(count);
    await expect(mapLinks.first()).toHaveAttribute("href", /maps/);
  }
});

test("public copy does not expose implementation notes", async ({ page }) => {
  for (const path of ["/galeria", "/zgloszenie", "/oferta/lato", "/oferta/zima", "/oferta/noclegi-nad-woda"]) {
    await page.goto(path);
    await expect(page.locator("body")).not.toContainText(/zarządzane przez właścicieli w CMS|porządkujemy automatycznie|po podłączeniu skrzynki|opublikowanego programu|termin opublikowanego wyjazdu|ostatni opublikowany turnus|zdjęcia kontenerów i domków dodamy po sesji/i);
  }
});

test("official brand assets are published locally", async ({ request }) => {
  for (const asset of ["/media/showteam-logo.svg", "/media/showteam-monkey.svg", "/favicon.ico", "/apple-touch-icon.png", "/pwa-192.png", "/pwa-512.png"]) {
    const response = await request.get(asset);
    expect(response.ok(), asset).toBe(true);
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
  await expect(page.getByRole("button", { name: "Zdjęcia obiektów" })).toHaveCount(0);
  await expect(page.getByText(/Zdjęcia kontenerów i domków dodamy po sesji/)).toHaveCount(0);
  await expect(page.getByText(/zł|PLN|cena/i)).toHaveCount(0);
});

test("customer can reserve an available equipment slot", async ({ page }) => {
  await page.route("**/api/reservations/availability?*", (route) => route.fulfill({ json: { slots: [
    { time: "09:00", available: 1, recommendation: { recommended: true, level: "best", basis: "forecast", label: "Najlepszy warun", detail: "Prognoza: spokojna woda, wiatr 6 km/h." } },
    { time: "10:00", available: 1, recommendation: { recommended: true, level: "medium", basis: "forecast", label: "Średni warun" } },
    { time: "11:00", available: 1, recommendation: { recommended: false, level: "poor", basis: "forecast", label: "Słaby warun" } },
    { time: "12:00", available: 1, recommendation: { recommended: false, level: "professional", basis: "forecast", label: "Warun profesjonalny" } },
  ], durationMinutes: 60, windStatus: "forecast" } }));
  await page.route("**/api/reservations", (route) => route.fulfill({ status: 201, json: { reference: "SHOW-TEST1234", equipment: "SUP", date: "2026-08-27", time: "09:00", endTime: "10:00" } }));
  await page.goto("/rezerwacje", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Sprzęt czeka/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Padel/ })).toBeVisible();
  await expect(page.getByText(/Najlepszy warun|Dobry w każdy warun/).first()).toBeVisible();
  await expect(page.getByText("Średni warun").last()).toBeVisible();
  await expect(page.getByText("Słaby warun").last()).toBeVisible();
  await expect(page.getByText("Warun profesjonalny").last()).toBeVisible();
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
  await page.goto("/");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  expect((await page.request.get("/sitemap.xml")).ok()).toBe(true);
  expect((await page.request.get("/robots.txt")).ok()).toBe(true);
  expect((await page.request.post("/api/track", { data: { path: "/" } })).status()).toBe(204);
});

test("events and news stay removed", async ({ request }) => {
  for (const path of ["/wydarzenia", "/aktualnosci", "/a/dodaj/wydarzenie", "/a/dodaj/aktualnosc", "/api/quick-event", "/api/quick-news", "/api/events", "/api/news"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test("booking statistics stay private", async ({ request }) => {
  const response = await request.get("/api/admin/statistics");
  expect(response.status()).toBe(401);
});

test("visual editor session stays private", async ({ page, request }) => {
  expect((await request.get("/api/admin/session")).status()).toBe(401);
  expect((await request.post("/api/admin/equipment", { data: {} })).status()).toBe(401);
  expect((await request.patch("/api/admin/equipment/1", { data: {} })).status()).toBe(401);
  expect((await request.patch("/api/admin/offers/1", { data: {} })).status()).toBe(401);
  expect((await request.patch("/api/admin/gallery/1", { data: {} })).status()).toBe(401);
  expect((await request.delete("/api/admin/gallery/1")).status()).toBe(401);
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Narzędzia administratora" })).toHaveCount(0);
});

test("operator workspaces require an admin login", async ({ request }) => {
  for (const path of ["/a/kalendarz", "/a/zgloszenia", "/a/statystyki", "/a/telewizory"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/admin/login?redirect=");
  }
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
    await expect(menu.getByRole("link")).toHaveCount(9);
    await expect(menu.getByRole("link", { name: /Zgłoszenie/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Galeria/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Kontakt i o nas/ })).toBeVisible();
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

  test("reservation navigation keeps the public navbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByRole("navigation", { name: "Menu mobilne" }).getByRole("link", { name: /Rezerwacje/ }).click();
    await expect(page).toHaveURL(/\/rezerwacje$/);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator('header a[href="/rezerwacje"][aria-current="page"]')).toHaveCount(1);
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

  test("visual editor opens a usable mobile equipment form", async ({ page }) => {
    await page.route("**/api/admin/session", (route) => route.fulfill({ json: { user: { email: "asia@showteam.eu", name: "Asia" } } }));
    await page.goto("/rezerwacje");
    await expect(page.getByRole("complementary", { name: "Narzędzia administratora" })).toBeVisible();
    await page.getByRole("button", { name: "Dodaj sprzęt" }).click();
    await expect(page.getByRole("dialog", { name: "Dodaj sprzęt" })).toBeVisible();
    await expect(page.getByLabel("Nazwa sprzętu")).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("offer content is edited directly on the page", async ({ page }) => {
    await page.route("**/api/admin/session", (route) => route.fulfill({ json: { user: { email: "asia@showteam.eu", name: "Asia" } } }));
    let savedTitle = "";
    let savedDates: { label: string; startDate: string; endDate: string }[] = [];
    await page.route("**/api/admin/offers/*", async (route) => {
      const data = await route.request().postDataJSON() as { title: string; dates: typeof savedDates };
      savedTitle = data.title;
      savedDates = data.dates;
      await route.fulfill({ json: { message: "Oferta została opublikowana." } });
    });
    await page.goto("/oferta/zima");
    const title = page.getByLabel("Nazwa oferty");
    await expect(title).toBeVisible();
    await title.fill("SHOWzima bez formularza");
    await expect(title).toHaveValue("SHOWzima bez formularza");
    await page.getByRole("button", { name: "Dodaj termin" }).click();
    await page.getByLabel("Nazwa terminu").last().fill("Nowy Rok");
    await page.getByLabel("Od").last().fill("2027-01-02");
    await page.getByLabel("Do").last().fill("2027-01-09");
    await expect(page.getByText("Podgląd", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect.poll(() => savedTitle).toBe("SHOWzima bez formularza");
    expect(savedDates.at(-1)).toEqual({ label: "Nowy Rok", startDate: "2027-01-02", endDate: "2027-01-09" });
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

  test("participant application is clear and keeps its mobile layout", async ({ page }) => {
    await page.route("**/api/applications", (route) => route.fulfill({ status: 201, json: { reference: "ZGL-TEST1234" } }));
    await page.goto("/zgloszenie");
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await expect(page.getByText("Wybierz rodzaj wyjazdu.")).toBeVisible();
    await page.getByRole("button", { name: "Zima", exact: true }).click();
    await expect(page.getByLabel("Transport autokarem")).toBeVisible();
    expect(await page.getByLabel(/Dyscyplina/).locator("option").allTextContents()).not.toContain("Sporty wodne");
    await page.getByRole("button", { name: "Lato", exact: true }).click();
    await expect(page.getByLabel("Transport autokarem")).toHaveCount(0);
    expect(await page.getByLabel(/Dyscyplina/).locator("option").allTextContents()).not.toContain("Narty");
    expect(await page.getByLabel(/Dyscyplina/).locator("option").allTextContents()).not.toContain("Snowboard");
    await page.getByRole("button", { name: "Szkolenia", exact: true }).click();
    await expect(page.getByLabel(/Dyscyplina/)).toHaveCount(0);
    await expect(page.getByLabel(/Poziom/)).toHaveCount(0);
    await page.getByRole("button", { name: "Lato", exact: true }).click();
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
