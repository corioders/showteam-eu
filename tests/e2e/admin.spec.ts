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

  test("blocking defaults to a full day and supports custom hours for one item", async ({ page }) => {
    await login(page);
    const submitted: Record<string, string>[] = [];
    await page.route("**/api/admin/availability-blocks", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { equipment: [{ id: 7, name: "SUP" }], blocks: [] } });
      }
      const input = route.request().postDataJSON() as Record<string, string>;
      submitted.push(input);
      return route.fulfill({ status: 201, json: {
        id: crypto.randomUUID(), equipment_id: input.equipmentId === "all" ? null : Number(input.equipmentId),
        equipment_name: input.equipmentId === "all" ? "Wszystkie sprzęty" : "SUP", booking_date: input.bookingDate,
        start_time: input.startTime, end_time: input.endTime, reason: input.reason || null, created_at: Date.now(),
      } });
    });
    await page.goto("/a/kalendarz?tab=dostepnosc");

    await expect(page.getByLabel("Cały dzień")).toBeChecked();
    await expect(page.getByLabel("Co blokujesz?")).toHaveValue("all");
    await page.getByRole("button", { name: "Zablokuj termin" }).click();
    await expect.poll(() => submitted.length).toBe(1);
    expect(submitted[0]).toMatchObject({ equipmentId: "all", startTime: "00:00", endTime: "23:59" });

    await page.getByLabel("Cały dzień").uncheck();
    await page.getByLabel("Co blokujesz?").selectOption("7");
    await page.getByLabel("Od", { exact: true }).first().fill("10:30");
    await page.getByLabel("Do", { exact: true }).first().fill("13:00");
    await page.getByRole("button", { name: "Zablokuj termin" }).click();
    await expect.poll(() => submitted.length).toBe(2);
    expect(submitted[1]).toMatchObject({ equipmentId: "7", startTime: "10:30", endTime: "13:00" });
  });
});
