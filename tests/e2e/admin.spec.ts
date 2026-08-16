import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function login(page: Page) {
  const response = await page.request.post("/api/users/login", {
    data: { email: adminEmail, password: adminPassword },
  });
  expect(response.ok()).toBe(true);
}

test.describe("mobile admin", () => {
  test.skip(!adminEmail || !adminPassword, "Test wymaga lokalnego konta administratora z seeda CI.");
  test.use({ viewport: { width: 390, height: 844 } });

  test("calendar opens as a list without nested scrolling or header overlap", async ({ page }) => {
    await login(page);
    await page.route("**/api/calendar/events?*", (route) => route.fulfill({ json: [] }));
    await page.goto("/a/kalendarz");

    const heading = page.getByRole("heading", { name: "Kalendarz bazy" });
    await expect(heading).toBeVisible();
    await expect(page.locator(".fc-list")).toBeVisible();
    await expect(page.locator(".fc-timegrid")).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const header = document.querySelector("header")?.getBoundingClientRect();
      const title = document.querySelector(".calendar-admin-heading h1")?.getBoundingClientRect();
      const nestedScroll = [...document.querySelectorAll(".calendar-admin-calendar *")].some((element) => {
        const node = element as HTMLElement;
        const overflow = getComputedStyle(node).overflowY;
        return (overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight + 1;
      });
      return {
        noOverlap: Boolean(header && title && title.top >= header.bottom),
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
        nestedScroll,
      };
    });
    expect(layout).toEqual({ noOverlap: true, noHorizontalOverflow: true, nestedScroll: false });
  });

  test("staff event defaults to a full day and blocks the whole base", async ({ page }) => {
    await login(page);
    const submitted: Record<string, unknown>[] = [];
    await page.route("**/api/calendar/events?*", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/admin/staff-events", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { events: [] } });
      }
      const input = route.request().postDataJSON() as Record<string, unknown>;
      submitted.push(input);
      return route.fulfill({ status: 201, json: { event: { ...input, id: crypto.randomUUID() }, conflictingBookings: 0 } });
    });
    await page.goto("/a/kalendarz");

    await page.getByRole("button", { name: "Dodaj wydarzenie" }).click();
    await expect(page.getByLabel("Cały dzień")).toBeChecked();
    await expect(page.getByLabel("Blokuje rezerwacje całej bazy")).toBeChecked();
    await page.getByLabel("Nazwa wydarzenia").fill("Baza nieczynna");
    await page.getByRole("button", { name: "Zapisz wydarzenie" }).click();
    await expect.poll(() => submitted.length).toBe(1);
    expect(submitted[0]).toMatchObject({ title: "Baza nieczynna", allDay: true, blocksBase: true, recurrence: "none" });
  });
});
