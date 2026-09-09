import { test, expect, type Page } from "@playwright/test";

// Les tests n’utilisent pas les serveurs communautaires OSM. Le moteur WebGL reste réel.
const tile = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=", "base64");
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: tile }));
});

async function openExplorer(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole("button", { name: /Explorer les|Ouvrir la liste/ }).click();
}

test("carte, crédits, filtres, fiche et recentrage", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".cesium-map")).toHaveAttribute("data-map-state", "ready");
  await expect(page.locator(".map-credits").getByRole("link", { name: "OpenStreetMap", exact: true })).toBeVisible();
  await openExplorer(page, isMobile);
  await expect(page.locator(".tree-list-item").first()).toBeVisible();
  const total = await page.locator(".tree-list-item").count();
  expect(total).toBeGreaterThan(100);
  await expect(page.getByRole("button", { name: "★ Remarquables" })).toBeDisabled();
  const search = page.getByRole("searchbox");
  await search.fill("érable");
  const filtered = await page.locator(".tree-list-item").count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(total);
  await expect(page.locator(".cesium-map")).toHaveAttribute("data-visible-count", String(filtered));
  await page.getByLabel("Espèce / taxon").selectOption("Acer japonicum");
  await expect(page.locator(".tree-list-item").first()).toContainText("Acer japonicum");
  await search.fill("aucun-arbre-xyz");
  await expect(page.getByText("Aucun arbre ne correspond à ces critères.")).toBeVisible();
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect(page.locator(".tree-list-item")).toHaveCount(total);
  await page.screenshot({ path: testInfo.outputPath("explorer.png") });
  await page.locator(".tree-list-item").first().click();
  await expect(page.getByRole("heading", { name: "Erable du Japon", exact: true })).toBeVisible();
  await expect(page.locator(".tree-detail")).toContainText("Non renseigné");
  await expect(page.locator(".tree-detail")).toContainText("GPS :");
  if (isMobile) await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tree.png") });
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
  if (isMobile) await expect(page.getByRole("button", { name: /Explorer les/ })).toBeFocused();
  else {
    await expect(page.locator(".tree-list-item").first()).toBeFocused();
    // La caméra a centré l’arbre sélectionné : un clic au centre rouvre sa fiche.
    await page.waitForTimeout(900);
    const box = (await page.locator(".cesium-map").boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".tree-detail")).toBeVisible();
  }
  await page.getByRole("button", { name: "⌖ Revenir au parc", exact: true }).click();
  await expect(page.locator(".tree-detail")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("panneau mobile modal, clavier et retour du focus", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Interaction propre au mobile");
  await page.goto("/");
  await expect(page.locator(".tree-list-item").first()).toBeAttached();
  await expect(page.getByRole("searchbox")).not.toBeVisible();
  await openExplorer(page, true);
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Explorer les/ })).toBeFocused();
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.getByRole("searchbox")).toBeVisible();
});

test("erreur des données puis récupération", async ({ page, isMobile }) => {
  await page.route("**/data/arbres-rennes.geojson", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  await openExplorer(page, isMobile);
  await expect(page.getByText("Les données n’ont pas pu être chargées.")).toBeVisible();
  await page.unroute("**/data/arbres-rennes.geojson");
  await page.getByRole("button", { name: "Réessayer les données" }).click();
  await expect(page.locator(".tree-list-item").first()).toBeVisible();
});

test("WebGL indisponible : les fiches restent utilisables", async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind.includes("webgl")) return null;
      return Reflect.apply(getContext, this, [kind, ...args]);
    } as typeof getContext;
  });
  await page.goto("/");
  await expect(page.getByText(/La carte 3D est indisponible/)).toBeVisible();
  await openExplorer(page, isMobile);
  await page.locator(".tree-list-item").first().click();
  await expect(page.locator(".tree-detail")).toBeVisible();
});

test("échec du fond de carte puis reprise", async ({ page }) => {
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("Le fond de carte n’a pas pu être chargé. Les arbres restent consultables.")).toBeVisible();
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: tile }));
  await page.getByRole("button", { name: "Réessayer le fond de carte" }).click();
  await expect(page.locator(".cesium-map")).toHaveAttribute("data-map-state", "ready");
  await expect(page.getByText("Le fond de carte n’a pas pu être chargé. Les arbres restent consultables.")).not.toBeVisible();
});
