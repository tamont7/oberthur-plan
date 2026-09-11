import { test, expect } from "@playwright/test";

test("attend un signal précis et reprend après une perte de précision", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ longitude: -1.7, latitude: 48.15, accuracy: 1000 });
  await page.goto("/");
  await expect(page.locator(".cesium-map")).toHaveAttribute("data-map-state", "ready");
  const button = page.getByRole("button", { name: "Me localiser", exact: true });
  await button.click();
  await expect(page.getByText(/Signal de localisation insuffisant/)).toBeVisible();
  await expect(page.getByText("Vous êtes trop loin du parc affiché.")).not.toBeVisible();
  await context.setGeolocation({ longitude: -1.66, latitude: 48.112, accuracy: 8 });
  await expect(page.getByText(/Précision estimée : 8 m/)).toBeVisible();
  await expect(button).toHaveClass(/is-active/);
  await context.setGeolocation({ longitude: -1.659, latitude: 48.113, accuracy: 150 });
  await expect(page.getByText(/Signal de localisation insuffisant/)).toBeVisible();
  await expect(button).not.toHaveClass(/is-active/);
  await context.setGeolocation({ longitude: -1.66, latitude: 48.112, accuracy: 5 });
  await expect(page.getByText(/Précision estimée : 5 m/)).toBeVisible();
  await button.click();
  await expect(page.getByText(/Localisation en cours/)).not.toBeVisible();
});
