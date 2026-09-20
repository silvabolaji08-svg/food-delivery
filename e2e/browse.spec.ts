import { expect, test } from "@playwright/test";

import { CLOSED_RESTAURANT, OPEN_RESTAURANT } from "./helpers";

const CUISINES = ["Italian", "Japanese", "Mexican", "Indian", "Healthy", "American"];

test("home lists every seeded restaurant", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/restaurants/"]')).toHaveCount(18);
});

test("each cuisine filter returns its three restaurants", async ({ page }) => {
  for (const cuisine of CUISINES) {
    await page.goto(`/?cuisine=${cuisine}`);
    await expect(
      page.locator('a[href^="/restaurants/"]'),
      `${cuisine} should have three restaurants`,
    ).toHaveCount(3);
  }
});

test("search narrows the list and survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search restaurants").fill("ramen");
  await page.waitForURL(/q=ramen/);

  // The input is debounced and the result list re-renders after navigation,
  // so this has to retry rather than read the DOM once.
  const cards = page.locator('a[href^="/restaurants/"]');
  await expect(cards).not.toHaveCount(18);
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByLabel("Search restaurants")).toHaveValue("ramen");
});

test("search ignores case", async ({ page }) => {
  // Postgres LIKE is case-sensitive where SQLite's was not, so searching
  // "pizza" silently matched nothing after the database moved.
  const counts: number[] = [];
  for (const term of ["pizza", "Pizza", "PIZZA"]) {
    await page.goto(`/?q=${term}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    counts.push(await page.locator('a[href^="/restaurants/"]').count());
  }

  expect(counts[0]).toBeGreaterThan(0);
  expect(new Set(counts).size, `all casings agree, got ${counts}`).toBe(1);
});

test("an empty search shows the empty state rather than nothing", async ({ page }) => {
  await page.goto("/?q=definitelynotacuisine");
  await expect(page.getByText("No restaurants match that search.")).toBeVisible();
});

test("a menu renders its dishes with photos", async ({ page }) => {
  await page.goto(`/restaurants/${OPEN_RESTAURANT}`);
  await expect(page.getByRole("heading", { name: "Nonna Rosa" })).toBeVisible();

  const images = page.locator("main img");
  await expect(images.first()).toBeVisible();

  // Every rendered image must actually have decoded, not 404.
  const broken = await images.evaluateAll(
    (els) => els.filter((i) => !(i as HTMLImageElement).naturalWidth).length,
  );
  expect(broken, "no broken images on the menu").toBe(0);
});

test("a closed restaurant cannot be ordered from", async ({ page }) => {
  await page.goto(`/restaurants/${CLOSED_RESTAURANT}`);
  await expect(page.getByText("Currently closed")).toBeVisible();

  const addButtons = page.getByRole("button", { name: /^Add / });
  const total = await addButtons.count();
  expect(total).toBeGreaterThan(0);

  for (let i = 0; i < total; i += 1) {
    await expect(addButtons.nth(i)).toBeDisabled();
  }
});

test("missing pages return a real 404, not a soft one", async ({ page }) => {
  // Regression guard: a root-level loading.tsx flushes the shell early and
  // locks the status at 200, which silently turned these into soft 404s.
  for (const path of ["/restaurants/nope", "/orders/BB-NOPE99", "/totally-missing"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should be 404`).toBe(404);
  }
});
