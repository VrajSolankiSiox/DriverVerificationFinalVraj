import path from "path";
import { test, expect } from "@playwright/test";

test("login to dashboard and run core flow skeleton", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@rankmenow.io");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/hotels/new");
  await page.getByLabel("Property name").fill("Smoke Test Hotel");
  await page.getByLabel("Address").fill("100 Demo Street");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("Country").fill("United States");
  await page.getByRole("button", { name: "Create hotel" }).click();
  await expect(page).toHaveURL(/hotels\//);

  await page.goto("/uploads/new");
  await page.getByLabel("Expedia rate file").setInputFiles(path.join(process.cwd(), "tests/fixtures/sample-expedia.csv"));
});
