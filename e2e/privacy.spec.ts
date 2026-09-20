import { expect, test } from "@playwright/test";

import { listedOrders, placeOrder } from "./helpers";

/**
 * /orders once listed every order in the database to every visitor, complete
 * with each customer's name, phone number and delivery address. These guard
 * the fix: orders are scoped to the browser that placed them.
 */
test("one browser cannot see another browser's orders", async ({ browser, baseURL }) => {
  const alice = await browser.newContext();
  const bob = await browser.newContext();

  const alicePage = await alice.newPage();
  const bobPage = await bob.newPage();

  const aliceOrder = await placeOrder(alicePage);
  const bobOrder = await placeOrder(bobPage);
  expect(aliceOrder).not.toBe(bobOrder);

  const aliceList = await listedOrders(alice, baseURL!);
  const bobList = await listedOrders(bob, baseURL!);

  expect(aliceList.numbers).toEqual([aliceOrder]);
  expect(bobList.numbers).toEqual([bobOrder]);

  await alice.close();
  await bob.close();
});

test("a browser that never ordered sees nothing and no personal data", async ({
  browser,
  baseURL,
}) => {
  const ordering = await browser.newContext();
  const orderingPage = await ordering.newPage();
  await placeOrder(orderingPage);

  const stranger = await browser.newContext();
  const { numbers, body } = await listedOrders(stranger, baseURL!);

  expect(numbers).toHaveLength(0);
  expect(body).toContain("No orders from this browser yet");
  expect(body).not.toContain("Kiln Street"); // the seeded address
  expect(body).not.toContain("555 0148"); // the seeded phone

  await ordering.close();
  await stranger.close();
});

test("an order number still works from a different browser", async ({
  browser,
  baseURL,
}) => {
  // The deliberate escape hatch: tracking a delivery from another device.
  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  const orderNumber = await placeOrder(ownerPage);

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const response = await otherPage.goto(`${baseURL}/orders/${orderNumber}`);

  expect(response?.status()).toBe(200);
  await expect(otherPage.getByText(orderNumber)).toBeVisible();

  await owner.close();
  await other.close();
});
