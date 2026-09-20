import { expect, test } from "@playwright/test";

import {
  OPEN_RESTAURANT,
  OTHER_RESTAURANT,
  fillCart,
  placeOrder,
} from "./helpers";

test("adding a dish updates the cart without hijacking the menu", async ({ page }) => {
  await fillCart(page, OPEN_RESTAURANT, 1);

  // The drawer deliberately does not open on a normal add: it would cover the
  // menu the customer is still ordering from.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open cart, 1 item/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /View cart/ })).toBeVisible();
});

test("a second restaurant raises a conflict instead of silently replacing", async ({ page }) => {
  await fillCart(page, OPEN_RESTAURANT, 1);

  await page.goto(`/restaurants/${OTHER_RESTAURANT}`);
  await page.getByRole("button", { name: /^Add / }).first().click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText("Start a new cart?");

  await page.getByRole("button", { name: "Keep my cart" }).click();
  await expect(dialog).toBeHidden();

  // The original basket survives.
  await page.goto("/checkout");
  await expect(page.getByRole("link", { name: "Nonna Rosa" })).toBeVisible();
});

test("checkout rejects bad details server-side", async ({ page }) => {
  await fillCart(page);
  await page.goto("/checkout");

  // Values that satisfy the browser's `required` but fail the server rules,
  // so this exercises the server and not just HTML validation.
  await page.fill("#customerName", "A");
  await page.fill("#customerPhone", "abc");
  await page.fill("#addressLine", "x");
  await page.fill("#city", "P");
  await page.fill("#postcode", "1");
  await page.getByRole("button", { name: /^Place order/ }).click();

  // Scoped to the form's own banner: Next's route announcer is also
  // role="alert", so an unscoped query matches two elements.
  await expect(page.locator('p[role="alert"]')).toContainText(
    "correct the highlighted fields",
  );
  await expect(page.locator("[aria-invalid=true]")).toHaveCount(5);
  expect(new URL(page.url()).pathname).toBe("/checkout");
});

test("an order can be placed, tracked to delivered, and looked up", async ({ page }) => {
  const orderNumber = await placeOrder(page);
  expect(orderNumber).toMatch(/^BB-[2-9A-HJ-NP-Z]{6}$/);

  // Placing empties the basket that produced it.
  await expect(page.getByRole("button", { name: /Open cart, empty/ })).toBeVisible();

  // The button survives each step with a new label, only vanishing at
  // DELIVERED, so progress is tracked by the heading changing instead.
  for (let step = 0; step < 4; step += 1) {
    const advance = page.getByRole("button", { name: /^Advance to/ });
    if ((await advance.count()) === 0) break;

    const heading = page.getByRole("heading", { level: 1 });
    const before = await heading.innerText();
    await advance.click();
    await expect(heading).not.toHaveText(before, { timeout: 20_000 });
  }

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Enjoy your meal!");

  // Order numbers are case-insensitive, since people retype them.
  await page.goto("/orders");
  await page.getByLabel("Order number").fill(orderNumber.toLowerCase());
  await page.getByRole("button", { name: "Track order" }).click();
  await page.waitForURL(new RegExp(orderNumber, "i"));
});

test("an order can be cancelled before the courier collects", async ({ page }) => {
  await placeOrder(page);

  await page.getByRole("button", { name: /Cancel order/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This order was cancelled.",
  );

  // A cancelled order leaves the happy path entirely.
  await expect(page.getByRole("button", { name: /^Advance to/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Cancel order/ })).toHaveCount(0);
});

test("the cart drawer opens and closes cleanly", async ({ page }) => {
  await fillCart(page, OPEN_RESTAURANT, 1);

  await page.getByRole("button", { name: /View cart/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByRole("button", { name: "Close cart" }).first().click();
  // Closing is driven by animationend, so the panel must actually unmount.
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("checkout with an empty cart offers a way out", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse restaurants" })).toBeVisible();
});
