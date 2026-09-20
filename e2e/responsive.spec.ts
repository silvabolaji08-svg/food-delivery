import { expect, test } from "@playwright/test";

import { OPEN_RESTAURANT, fillCart, hasHorizontalOverflow, placeOrder } from "./helpers";

const DEVICE_WIDTH = 390;

/**
 * The header once overflowed a 390px screen by 23px, pushing the nav off
 * and making the cart drawer render wider than the viewport. It went
 * unnoticed because a mobile-emulating viewport scales the layout to fit an
 * overflowing page, so `window.innerWidth` grows to match and hides it.
 * These compare against the device width instead.
 */
const PATHS = ["/", "/checkout", "/orders", "/credits", `/restaurants/${OPEN_RESTAURANT}`];

for (const path of PATHS) {
  test(`${path} does not overflow a ${DEVICE_WIDTH}px screen`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    expect(await hasHorizontalOverflow(page, DEVICE_WIDTH)).toBe(false);
  });
}

test("the tracking page fits too", async ({ page }) => {
  await placeOrder(page);
  expect(await hasHorizontalOverflow(page, DEVICE_WIDTH)).toBe(false);
});

test("the wordmark gives way to the mark on a narrow screen", async ({ page }) => {
  await page.goto("/");
  // Mark stays; wordmark hides below `sm` so the nav still fits.
  await expect(page.locator(".brand-mark-art")).toBeVisible();
  await expect(page.locator(".brand-mark-word")).toBeHidden();
});

test("the last dish clears the floating cart bar", async ({ page }) => {
  await fillCart(page, OPEN_RESTAURANT, 1);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);

  // The sticky bar used to sit on top of the final rows, making them unclickable.
  const covered = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button[aria-label^='Add ']")];
    const last = buttons[buttons.length - 1];
    const r = last.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !last.contains(top);
  });
  expect(covered).toBe(false);
});
