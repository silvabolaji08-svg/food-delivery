"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { calculateTotals, formatMoney } from "@/lib/money";
import { getMenuItemsByIds, getRestaurantById } from "@/lib/queries";
import {
  ORDER_FLOW,
  isCancellable,
  isOrderStatus,
  statusIndex,
} from "@/lib/order-status";
// A "use server" module may only export async functions, so the state shape
// these actions return is declared alongside the form instead.
import type { CartLineInput, PlaceOrderState } from "@/lib/checkout";

/** The maximum quantity of any single dish in one order. */
const MAX_LINE_QUANTITY = 20;

function generateOrderNumber(): string {
  // Ambiguous characters (0/O, 1/I) are excluded so the code can be read aloud.
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BB-${suffix}`;
}

function parseCartLines(raw: FormDataEntryValue | null): CartLineInput[] {
  if (typeof raw !== "string" || raw.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  // The cart arrives from the browser, so every field is re-checked here
  // rather than trusted. No price is read from this payload at all.
  return parsed.flatMap((entry): CartLineInput[] => {
    if (typeof entry !== "object" || entry === null) return [];

    const { menuItemId, quantity } = entry as Record<string, unknown>;
    if (typeof menuItemId !== "string" || menuItemId.length === 0) return [];
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) return [];

    const clamped = Math.min(Math.floor(quantity), MAX_LINE_QUANTITY);
    if (clamped < 1) return [];

    return [{ menuItemId, quantity: clamped }];
  });
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Creates an order from the checkout form.
 *
 * Quantities come from the browser, but every price, the delivery fee, the
 * service fee and the restaurant binding are re-read from the database, so a
 * tampered cart cannot alter what an order costs.
 */
export async function placeOrder(
  _prevState: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const customerName = readField(formData, "customerName");
  const customerPhone = readField(formData, "customerPhone");
  const customerEmail = readField(formData, "customerEmail");
  const addressLine = readField(formData, "addressLine");
  const city = readField(formData, "city");
  const postcode = readField(formData, "postcode");
  const deliveryNotes = readField(formData, "deliveryNotes");
  const paymentMethod =
    readField(formData, "paymentMethod") === "CASH" ? "CASH" : "CARD";

  const fieldErrors: PlaceOrderState["fieldErrors"] = {};

  if (customerName.length < 2) {
    fieldErrors.customerName = "Tell us who the courier should ask for.";
  }
  // Deliberately permissive: international numbers vary far too much to
  // pattern-match safely, so this only rejects obvious non-numbers.
  if (customerPhone.replace(/[^0-9]/g, "").length < 7) {
    fieldErrors.customerPhone = "Enter a phone number we can reach you on.";
  }
  if (customerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) {
    fieldErrors.customerEmail = "That email address does not look right.";
  }
  if (addressLine.length < 4) {
    fieldErrors.addressLine = "Enter a street address.";
  }
  if (city.length < 2) {
    fieldErrors.city = "Enter a city or town.";
  }
  if (postcode.length < 3) {
    fieldErrors.postcode = "Enter a postcode.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  const items = parseCartLines(formData.get("items"));
  if (items.length === 0) {
    return { error: "Your cart is empty.", fieldErrors: {} };
  }

  const restaurantId = readField(formData, "restaurantId");
  const restaurant = await getRestaurantById(restaurantId);

  if (!restaurant) {
    return { error: "That restaurant no longer exists.", fieldErrors: {} };
  }
  if (!restaurant.isOpen) {
    return {
      error: `${restaurant.name} is closed right now and cannot accept orders.`,
      fieldErrors: {},
    };
  }

  const menuItems = await getMenuItemsByIds(
    items.map((item) => item.menuItemId),
  );
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  const lines: {
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    nameSnapshot: string;
  }[] = [];

  for (const item of items) {
    const menuItem = byId.get(item.menuItemId);

    if (!menuItem) {
      return {
        error: "An item in your cart is no longer on the menu.",
        fieldErrors: {},
      };
    }
    if (menuItem.section.restaurantId !== restaurant.id) {
      return {
        error: "Your cart mixes items from different restaurants.",
        fieldErrors: {},
      };
    }
    if (!menuItem.isAvailable) {
      return { error: `${menuItem.name} has just sold out.`, fieldErrors: {} };
    }

    lines.push({
      menuItemId: menuItem.id,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      nameSnapshot: menuItem.name,
    });
  }

  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

  if (subtotal < restaurant.minimumOrder) {
    return {
      error: `${restaurant.name} has a ${formatMoney(
        restaurant.minimumOrder,
      )} minimum order. Your basket comes to ${formatMoney(subtotal)}.`,
      fieldErrors: {},
    };
  }

  const totals = calculateTotals(subtotal, restaurant.deliveryFee);
  const estimatedAt = new Date(
    Date.now() + restaurant.deliveryMaxMinutes * 60 * 1000,
  );

  // `orderNumber` is unique; retry a few times in the unlikely event of a clash.
  let orderNumber = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateOrderNumber();
    const clash = await prisma.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });
    if (!clash) {
      orderNumber = candidate;
      break;
    }
  }
  if (!orderNumber) {
    return {
      error: "Could not allocate an order number. Please try again.",
      fieldErrors: {},
    };
  }

  await prisma.order.create({
    data: {
      orderNumber,
      status: "PLACED",
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      addressLine,
      city,
      postcode,
      deliveryNotes: deliveryNotes || null,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      serviceFee: totals.serviceFee,
      total: totals.total,
      paymentMethod,
      estimatedAt,
      restaurantId: restaurant.id,
      items: { create: lines },
    },
  });

  revalidatePath("/orders");

  // `redirect` throws a control-flow exception, so nothing below it runs.
  redirect(`/orders/${orderNumber}`);
}

/**
 * Advances an order one step along the happy path. In a real system the
 * restaurant POS or a courier app would drive this; here it is exposed on the
 * tracking page so the delivery flow can be watched end to end.
 */
export async function advanceOrderStatus(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true },
  });

  if (!order || !isOrderStatus(order.status)) return;

  // A cancelled order is off the happy path, so it has no next step.
  const current = statusIndex(order.status);
  if (current === -1 || current >= ORDER_FLOW.length - 1) return;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: ORDER_FLOW[current + 1] },
  });

  revalidatePath(`/orders/${orderNumber}`);
  revalidatePath("/orders");
}

/** Cancels an order, as long as it has not already left the restaurant. */
export async function cancelOrder(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true },
  });

  if (!order || !isOrderStatus(order.status)) return;

  // Once a courier has the food, cancelling stops being a self-serve action.
  if (!isCancellable(order.status)) return;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/orders/${orderNumber}`);
  revalidatePath("/orders");
}
