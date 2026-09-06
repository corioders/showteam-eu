import { expect, test } from "@playwright/test";

const loginUrlPattern = /\/admin\/login/;

test("logs into Payload with username and password", async ({ page }) => {
	const rejected = await page.request.post("/api/users/login", { data: { password: "wrong", username: "core users" } });
	expect(rejected.ok()).toBe(false);

	const accepted = await page.request.post("/api/users/login", { data: { password: "admin", username: "core users" } });
	expect(accepted.ok()).toBe(true);

	await page.goto("/admin");
	await expect(page).not.toHaveURL(loginUrlPattern);
});
