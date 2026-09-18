"use client";

import { useSyncExternalStore } from "react";

// Nothing ever changes, so the store never needs to notify a subscriber.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` on the server and through the hydration render, `true` afterwards.
 *
 * The cart is restored from localStorage, so anything derived from it would
 * otherwise differ between the server HTML and the first client render. Gating
 * on this hook keeps the two identical without a setState-in-effect, which
 * React flags for the cascading render it causes.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
