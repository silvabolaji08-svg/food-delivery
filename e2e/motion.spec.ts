import { expect, test } from "@playwright/test";

/**
 * Every entrance animation starts hidden and ends at rest with
 * `animation-fill-mode: forwards`. That is what lets the reduced-motion rule
 * collapse them to an instant reveal — get it wrong and the element stays
 * invisible forever for anyone with the preference set.
 */
test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("content is visible immediately, not animated in", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(250);

    const hidden = await page
      .locator('a[href^="/restaurants/"]')
      .evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== "1").length);
    expect(hidden, "no card left mid-animation").toBe(0);

    const logoHidden = await page
      .locator(".brand-mark-art, .brand-mark-word")
      .evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity === "0").length);
    expect(logoHidden, "the logo must not stay invisible").toBe(0);
  });
});

test("cards settle to fully visible once the stagger finishes", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1800);

  const notSettled = await page
    .locator('a[href^="/restaurants/"]')
    .evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== "1").length);
  expect(notSettled).toBe(0);
});

test("the cart badge reacts when the count rises", async ({ page }) => {
  await page.goto("/restaurants/nonna-rosa");
  await page.getByRole("button", { name: /^Add / }).first().click();

  // Adding no longer opens the drawer, so this badge is the only confirmation.
  await expect(page.locator("header .animate-badge-bump")).toBeVisible();
});
