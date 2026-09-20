import { expect, test } from "@playwright/test";

import { OPEN_RESTAURANT, OTHER_RESTAURANT, fillCart, fillCheckoutForm } from "./helpers";

/**
 * Appends a line to the hidden cart payload the checkout form submits.
 *
 * React controls that input, so the value has to be set through the native
 * setter and an input event dispatched, or React overwrites it on re-render.
 */
async function injectCartLine(
  page: import("@playwright/test").Page,
  menuItemId: string,
) {
  await page.evaluate((id) => {
    const input = document.querySelector<HTMLInputElement>('input[name="items"]')!;
    const items = JSON.parse(input.value);
    items.push({ menuItemId: id, quantity: 1 });
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, JSON.stringify(items));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, menuItemId);
}

async function forceSubmit(page: import("@playwright/test").Page) {
  await page.evaluate(() =>
    document.querySelector('button[type="submit"]')!.removeAttribute("disabled"),
  );
  await page.getByRole("button", { name: /^Place order/ }).click();
}

test("prices come from the database, never the browser", async ({ page }) => {
  await fillCart(page, OPEN_RESTAURANT, 3);

  // Rewrite every price to a penny and blow past the per-line cap.
  const realTotal = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("bitebox-cart")!);
    const before = raw.state.lines.reduce(
      (n: number, l: { price: number; quantity: number }) => n + l.price * l.quantity,
      0,
    );
    raw.state.lines.forEach((l: { price: number }) => (l.price = 1));
    raw.state.lines[0].quantity = 999;
    localStorage.setItem("bitebox-cart", JSON.stringify(raw));
    return before;
  });

  await page.goto("/checkout");
  await fillCheckoutForm(page);
  await forceSubmit(page);
  await page.waitForURL(/\/orders\/BB-/);

  const receipt = await page.locator("aside section").first().innerText();

  // The tampered basket claimed ~3 cents; the receipt must reflect real money.
  expect(receipt).not.toContain("$0.01");
  expect(receipt).toContain("20×"); // quantity clamped from 999
  const total = Number(receipt.match(/Total\s+\$([\d,]+\.\d{2})/)?.[1].replace(/,/g, ""));
  expect(total).toBeGreaterThan(realTotal / 100);
});

test("the minimum order is enforced on the server too", async ({ page }) => {
  await fillCart(page, OPEN_RESTAURANT, 4);

  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("bitebox-cart")!);
    const cheapest = raw.state.lines
      .slice()
      .sort((a: { price: number }, b: { price: number }) => a.price - b.price)[0];
    cheapest.quantity = 1;
    raw.state.lines = [cheapest];
    localStorage.setItem("bitebox-cart", JSON.stringify(raw));
  });

  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: /^Place order/ })).toBeDisabled();

  await fillCheckoutForm(page);
  await forceSubmit(page);

  await expect(page.locator('p[role="alert"]')).toContainText("minimum order");
  expect(new URL(page.url()).pathname).toBe("/checkout");
});

test("a cart cannot mix two restaurants", async ({ page }) => {
  // Grab a real dish id belonging to a different restaurant.
  await fillCart(page, OTHER_RESTAURANT, 1);
  const foreignId = await page.evaluate(
    () => JSON.parse(localStorage.getItem("bitebox-cart")!).state.lines[0].menuItemId,
  );

  await page.evaluate(() => localStorage.removeItem("bitebox-cart"));
  await fillCart(page, OPEN_RESTAURANT, 4);

  await page.goto("/checkout");
  await fillCheckoutForm(page);
  await injectCartLine(page, foreignId);

  await forceSubmit(page);
  await expect(page.locator('p[role="alert"]')).toContainText("different restaurants");
});

test("an unknown dish id is rejected", async ({ page }) => {
  await fillCart(page, OPEN_RESTAURANT, 4);
  await page.goto("/checkout");
  await fillCheckoutForm(page);

  await injectCartLine(page, "not-a-real-id");
  await forceSubmit(page);

  await expect(page.locator('p[role="alert"]')).toContainText("no longer on the menu");
});
