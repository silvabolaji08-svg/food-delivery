import type { BrowserContext, Page } from "@playwright/test";

/** A restaurant that is open, has a full menu, and has a minimum order. */
export const OPEN_RESTAURANT = "nonna-rosa";
export const OTHER_RESTAURANT = "sakura-ramen-bar";

/** Seeded as closed, so it exercises the not-accepting-orders path. */
export const CLOSED_RESTAURANT = "brick-lane-burgers";

export const VALID_DETAILS = {
  customerName: "Jordan Ellis",
  customerPhone: "+1 555 0148",
  addressLine: "14 Kiln Street",
  city: "Portland",
  postcode: "97205",
};

/**
 * Adds dishes until the basket clears the restaurant's minimum order.
 * Four of Nonna Rosa's pizzas comfortably beats its $15.00 floor.
 */
export async function fillCart(page: Page, slug = OPEN_RESTAURANT, count = 4) {
  await page.goto(`/restaurants/${slug}`);
  const add = page.getByRole("button", { name: /^Add / });
  await add.first().waitFor();

  for (let i = 0; i < count; i += 1) {
    const button = add.nth(i);
    // Keeps the target clear of the floating cart bar, which overlays the
    // bottom of the viewport once the basket has something in it.
    await button.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await button.click();
    await page.waitForTimeout(150);
  }
}

export async function fillCheckoutForm(page: Page) {
  for (const [field, value] of Object.entries(VALID_DETAILS)) {
    await page.fill(`#${field}`, value);
  }
}

/** Places an order and returns its order number. */
export async function placeOrder(page: Page, slug = OPEN_RESTAURANT) {
  await fillCart(page, slug);
  await page.goto("/checkout");
  await fillCheckoutForm(page);
  await page.getByRole("button", { name: /^Place order/ }).click();
  await page.waitForURL(/\/orders\/BB-/);

  const orderNumber = page.url().split("/").pop();
  if (!orderNumber) throw new Error("no order number in the redirect URL");
  return orderNumber;
}

/** The order numbers /orders lists for this browser context. */
export async function listedOrders(context: BrowserContext, baseURL: string) {
  const page = await context.newPage();
  await page.goto(`${baseURL}/orders`);
  await page.getByRole("heading", { name: "Orders" }).waitFor();

  const numbers = await page
    .locator('a[href^="/orders/BB-"]')
    .evaluateAll((links) =>
      links.map((a) => a.getAttribute("href")!.split("/").pop()!),
    );

  const body = await page.locator("body").innerText();
  await page.close();
  return { numbers, body };
}

/** True when the document is wider than the device, i.e. it overflows. */
export async function hasHorizontalOverflow(page: Page, deviceWidth: number) {
  return page.evaluate(
    (w) => document.documentElement.scrollWidth > w + 1,
    deviceWidth,
  );
}
