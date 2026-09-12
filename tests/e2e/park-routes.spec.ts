import { expect, test } from "@playwright/test";

test("park addresses, home and browser history", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Parc Oberthür — Parc Rennes");
  await expect(page.locator(".brand img")).toBeVisible();
  const icon = await page.request.get("/favicon.svg");
  expect(icon.ok()).toBeTruthy();
  await page.locator(".park-picker summary").click();
  await page.getByRole("button", { name: "Parc du Thabor", exact: true }).click();
  await expect(page).toHaveURL(/\/thabor$/);
  await expect(page).toHaveTitle("Parc du Thabor — Parc Rennes");
  await page.reload();
  await expect(page).toHaveTitle("Parc du Thabor — Parc Rennes");
  await page.locator(".park-picker summary").click();
  await page.getByRole("button", { name: "Parc Oberthür", exact: true }).click();
  await expect(page).toHaveURL(/\/oberthur$/);
  await expect(page).toHaveTitle("Parc Oberthür — Parc Rennes");
  await page.goBack();
  await expect(page).toHaveTitle("Parc du Thabor — Parc Rennes");
  await page.goForward();
  await expect(page).toHaveTitle("Parc Oberthür — Parc Rennes");
  await page.reload();
  await expect(page).toHaveTitle("Parc Oberthür — Parc Rennes");
  await page.goto("/?plan=thabor");
  await expect(page).toHaveURL(/\/thabor$/);
  await expect(page).toHaveTitle("Parc du Thabor — Parc Rennes");
});
